-- Estado explícito da pergunta em aberto na conversa (SIM/NÃO resolve exatamente uma ação)
alter table public.wa_sessions
  add column if not exists pending_action jsonb;

-- Impede dois agendamentos ativos no mesmo horário para o mesmo profissional
create unique index if not exists appointments_doctor_slot_active_uidx
  on public.appointments (doctor_id, scheduled_at)
  where status not in ('cancelada', 'lista_espera');
