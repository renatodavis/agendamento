-- Tabela de perfis de negócio pré-configurados
CREATE TABLE IF NOT EXISTS profiles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  domain_type  text NOT NULL,
  business_context text NOT NULL DEFAULT '',
  out_of_scope_message text NOT NULL DEFAULT 'Lamento, mas não atendemos essa solicitação. Posso ajudar com: {services_list}',
  specialties  jsonb NOT NULL DEFAULT '[]',
  vocabulary   jsonb NOT NULL DEFAULT '{}',
  is_active    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Garante que apenas um perfil esteja ativo por vez
CREATE UNIQUE INDEX IF NOT EXISTS profiles_one_active
  ON profiles (is_active) WHERE is_active = true;

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Autenticados podem ler/escrever perfis
CREATE POLICY "profiles_auth_read"  ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_auth_write" ON profiles FOR ALL    TO authenticated USING (true) WITH CHECK (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION set_profiles_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_profiles_updated_at();

-- Seed: 6 perfis pré-configurados
INSERT INTO profiles (name, domain_type, business_context, out_of_scope_message, specialties, vocabulary, is_active) VALUES

(
  'Clínica Médica',
  'clinica',
  'Clínica médica com atendimento multidisciplinar. Prioridade em acolhimento humanizado e agilidade no agendamento. Sempre pergunte o convênio antes de confirmar a consulta.',
  'Lamento, mas não atendemos essa especialidade. Atendemos: {services_list}. Para urgências, acione o SAMU (192).',
  '[
    {"name":"Clínico Geral","description":"Consultas gerais e check-up"},
    {"name":"Cardiologia","description":"Coração e sistema cardiovascular"},
    {"name":"Dermatologia","description":"Pele, cabelo e unhas"},
    {"name":"Pediatria","description":"Atendimento infantil e adolescente"},
    {"name":"Ginecologia","description":"Saúde da mulher"},
    {"name":"Ortopedia","description":"Ossos, músculos e articulações"}
  ]',
  '{"client":"paciente","professional":"médico","professionals":"médicos","appointment":"consulta","business_noun":"clínica","emoji":"🏥","urgency_redirect":"SAMU (192) ou pronto-socorro"}',
  true
),

(
  'Odontologia',
  'odontologia',
  'Clínica odontológica com foco em saúde bucal completa. Atende desde limpezas de rotina até procedimentos estéticos. Pergunte se o paciente possui convênio odontológico.',
  'Lamento, mas não realizamos esse procedimento. Realizamos: {services_list}. Para urgências odontológicas, procure o pronto-atendimento mais próximo.',
  '[
    {"name":"Clínico Geral","description":"Limpeza, restauração e check-up"},
    {"name":"Ortodontia","description":"Aparelhos e alinhamento dental"},
    {"name":"Implantodontia","description":"Implantes dentários"},
    {"name":"Endodontia","description":"Tratamento de canal"},
    {"name":"Periodontia","description":"Saúde das gengivas"},
    {"name":"Estética","description":"Clareamento e facetas"}
  ]',
  '{"client":"paciente","professional":"dentista","professionals":"dentistas","appointment":"consulta","business_noun":"clínica odontológica","emoji":"🦷","urgency_redirect":"pronto-atendimento odontológico"}',
  false
),

(
  'Veterinária',
  'veterinaria',
  'Clínica veterinária com atendimento a cães, gatos e pequenos animais. Atendimento humanizado ao tutor e ao pet. Sempre pergunte o nome e espécie do animal.',
  'Lamento, mas não realizamos esse procedimento. Atendemos: {services_list}. Em caso de emergência, procure uma clínica 24h.',
  '[
    {"name":"Clínico Geral","description":"Consultas e exames de rotina"},
    {"name":"Vacinação","description":"Vacinas e vermifugação"},
    {"name":"Cirurgia","description":"Procedimentos cirúrgicos"},
    {"name":"Dermatologia","description":"Pele e pelo dos pets"},
    {"name":"Odontologia Veterinária","description":"Saúde bucal animal"},
    {"name":"Banho e Tosa","description":"Higiene e estética pet"}
  ]',
  '{"client":"tutor","professional":"veterinário","professionals":"veterinários","appointment":"consulta","business_noun":"clínica veterinária","emoji":"🐾","urgency_redirect":"clínica veterinária 24h"}',
  false
),

(
  'Academia / Personal',
  'personal',
  'Academia e serviços de personal trainer. Foco em resultados personalizados e acompanhamento próximo. Pergunte o objetivo do aluno (emagrecimento, ganho de massa, condicionamento, reabilitação).',
  'Lamento, mas não oferecemos esse serviço. Oferecemos: {services_list}. Para dúvidas de saúde, consulte um médico.',
  '[
    {"name":"Musculação","description":"Treinos de força e hipertrofia"},
    {"name":"Personal Training","description":"Acompanhamento individual"},
    {"name":"Funcional","description":"Treinamento funcional em grupo"},
    {"name":"Cardio","description":"Atividades aeróbicas e condicionamento"},
    {"name":"Pilates","description":"Pilates solo e com equipamentos"},
    {"name":"Avaliação Física","description":"Avaliação corporal e bioimpedância"}
  ]',
  '{"client":"aluno","professional":"personal trainer","professionals":"personal trainers","appointment":"sessão","business_noun":"academia","emoji":"💪","urgency_redirect":"pronto-socorro em caso de lesão"}',
  false
),

(
  'Salão de Beleza',
  'salao',
  'Salão de beleza com serviços completos de cabelo, estética e beleza. Tom descontraído e acolhedor. Pergunte o tipo de cabelo ou serviço desejado para indicar o profissional certo.',
  'Lamento, mas não realizamos esse serviço. Realizamos: {services_list}. Posso agendar outro serviço para você?',
  '[
    {"name":"Corte","description":"Corte feminino, masculino e infantil"},
    {"name":"Coloração","description":"Tintura, mechas e balayage"},
    {"name":"Tratamento","description":"Hidratação, cauterização e botox capilar"},
    {"name":"Escova e Penteado","description":"Escova progressiva e penteados para eventos"},
    {"name":"Manicure e Pedicure","description":"Unhas das mãos e pés"},
    {"name":"Sobrancelha","description":"Design e micropigmentação de sobrancelhas"}
  ]',
  '{"client":"cliente","professional":"profissional","professionals":"profissionais","appointment":"atendimento","business_noun":"salão","emoji":"💇","urgency_redirect":""}',
  false
),

(
  'Barbearia',
  'barbearia',
  'Barbearia moderna com foco em corte masculino e cuidados com a barba. Ambiente descontraído. Pergunte se o cliente prefere algum barbeiro específico.',
  'Lamento, mas não realizamos esse serviço. Realizamos: {services_list}. Posso agendar outro horário para você?',
  '[
    {"name":"Corte","description":"Corte masculino clássico e moderno"},
    {"name":"Barba","description":"Barba completa, acabamento e design"},
    {"name":"Corte + Barba","description":"Combo corte e barba"},
    {"name":"Sobrancelha","description":"Design de sobrancelha masculina"},
    {"name":"Pigmentação","description":"Pigmentação de barba e cabelo"},
    {"name":"Relaxamento","description":"Relaxamento e hidratação capilar masculina"}
  ]',
  '{"client":"cliente","professional":"barbeiro","professionals":"barbeiros","appointment":"atendimento","business_noun":"barbearia","emoji":"✂️","urgency_redirect":""}',
  false
);
