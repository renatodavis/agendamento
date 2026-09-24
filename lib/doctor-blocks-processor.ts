import { createServerClient } from '@/lib/supabase'

interface BlockedSlot {
  id: string
  doctor_id: string
  blocked_date: string
  start_time: string | null
  end_time: string | null
  reason: string | null
}

type DB = ReturnType<typeof createServerClient>

/**
 * Called after a doctor blocked slot is inserted.
 * Finds all appointments in the blocked period, finds the nearest available
 * slot for each (same time-of-day preference), and creates one
 * approval_request per appointment for the receptionist.
 */
export async function processBlockAffectedAppointments(block: BlockedSlot): Promise<number> {
  const db = createServerClient()

  // 1. Find appointments on the blocked date for this doctor
  let query = db
    .from('appointments')
    .select('id, scheduled_at, patient_id, patient:patients(id, name)')
    .eq('doctor_id', block.doctor_id)
    .not('status', 'in', '("cancelada","lista_espera","realizada")')
    .gte('scheduled_at', `${block.blocked_date}T00:00:00`)
    .lte('scheduled_at', `${block.blocked_date}T23:59:59`)

  // Narrow to the partial time window if provided
  if (block.start_time && block.end_time) {
    query = query
      .gte('scheduled_at', `${block.blocked_date}T${block.start_time}`)
      .lte('scheduled_at', `${block.blocked_date}T${block.end_time}`)
  }

  const { data: appointments, error } = await query
  if (error) {
    console.error('[blocks-processor] error fetching appointments:', error)
    return 0
  }
  if (!appointments?.length) return 0

  // 2. Doctor info
  const { data: doctor } = await db
    .from('doctors')
    .select('id, name, specialty')
    .eq('id', block.doctor_id)
    .single()

  // 3. Doctor weekly schedule
  const { data: schedules } = await db
    .from('doctor_schedules')
    .select('day_of_week, start_time, end_time, slot_minutes')
    .eq('doctor_id', block.doctor_id)

  let created = 0
  for (const appt of appointments) {
    const patient = appt.patient as unknown as { id: string; name: string } | null
    const origDate = new Date(appt.scheduled_at)
    const preferredHour = origDate.getUTCHours()
    const preferredMin = origDate.getUTCMinutes()

    const suggestedNewAt = schedules?.length
      ? await findNearestSlot(db, block.doctor_id, block.blocked_date, preferredHour, preferredMin, schedules)
      : null

    await db.from('approval_requests').insert({
      patient_id: appt.patient_id,
      patient_name: patient?.name ?? 'Paciente',
      doctor_id: block.doctor_id,
      request_type: 'reagendamento_forcado',
      status: 'pending',
      message_to_receptionist:
        block.reason
          ? `Médico bloqueou agenda: ${block.reason}`
          : 'Médico adicionou bloqueio de agenda',
      details: {
        appointment_id: appt.id,
        scheduled_at: appt.scheduled_at,
        suggested_new_at: suggestedNewAt,
        doctor_name: doctor?.name ?? null,
        doctor_specialty: doctor?.specialty ?? null,
        block_reason: block.reason ?? null,
      },
    })
    created++
  }

  if (created > 0) {
    console.log(`[blocks-processor] criadas ${created} approval_request(s) para bloqueio ${block.id}`)
  }
  return created
}

async function findNearestSlot(
  db: DB,
  doctorId: string,
  blockedDate: string,
  preferredHour: number,
  preferredMin: number,
  schedules: Array<{ day_of_week: number; start_time: string; end_time: string; slot_minutes: number }>
): Promise<string | null> {
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  // Future blocks (to skip them)
  const { data: futureBlocks } = await db
    .from('doctor_blocked_slots')
    .select('blocked_date, start_time, end_time')
    .eq('doctor_id', doctorId)
    .gte('blocked_date', today.toISOString().split('T')[0])

  // Already-booked appointments
  const { data: booked } = await db
    .from('appointments')
    .select('scheduled_at')
    .eq('doctor_id', doctorId)
    .not('status', 'in', '("cancelada","lista_espera")')
    .gte('scheduled_at', today.toISOString())

  const bookedSet = new Set(booked?.map(a => a.scheduled_at) ?? [])
  const blockList = futureBlocks ?? []
  const scheduleMap = new Map(schedules.map(s => [s.day_of_week, s]))
  const preferredTotalMin = preferredHour * 60 + preferredMin

  // Start searching from the day after the blocked date
  const searchStart = new Date(blockedDate + 'T12:00:00Z')
  searchStart.setUTCDate(searchStart.getUTCDate() + 1)

  for (let i = 0; i < 30; i++) {
    const day = new Date(searchStart)
    day.setUTCDate(searchStart.getUTCDate() + i)

    const dow = day.getUTCDay()
    const sched = scheduleMap.get(dow)
    if (!sched) continue

    const dateStr = day.toISOString().split('T')[0]

    // Skip fully blocked day
    const fullyBlocked = blockList.some(b => b.blocked_date === dateStr && !b.start_time && !b.end_time)
    if (fullyBlocked) continue

    const [sh, sm] = sched.start_time.split(':').map(Number)
    const [eh, em] = sched.end_time.split(':').map(Number)
    const slotLen = sched.slot_minutes ?? 60
    const dayStart = sh * 60 + sm
    const dayEnd = eh * 60 + em

    // Build all slots and rank by time-of-day proximity
    const slots: { totalMin: number; diff: number }[] = []
    for (let m = dayStart; m < dayEnd; m += slotLen) {
      slots.push({ totalMin: m, diff: Math.abs(m - preferredTotalMin) })
    }
    slots.sort((a, b) => a.diff - b.diff)

    for (const s of slots) {
      const slotH = Math.floor(s.totalMin / 60)
      const slotM = s.totalMin % 60
      const iso = new Date(Date.UTC(
        day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(),
        slotH, slotM, 0
      )).toISOString()

      if (bookedSet.has(iso)) continue

      // Skip if falls inside a partial block
      const inPartialBlock = blockList.some(b => {
        if (b.blocked_date !== dateStr || !b.start_time || !b.end_time) return false
        const [bsh, bsm] = b.start_time.split(':').map(Number)
        const [beh, bem] = b.end_time.split(':').map(Number)
        const bStart = bsh * 60 + bsm
        const bEnd = beh * 60 + bem
        return s.totalMin >= bStart && s.totalMin < bEnd
      })
      if (inPartialBlock) continue

      return iso
    }
  }

  return null
}
