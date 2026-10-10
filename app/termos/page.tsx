import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage from '@/components/legal/LegalPage'
import { LEGAL, openGraphFor } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Termos de Uso',
  description: 'Condições de uso do AgendaAgentic, o assistente de agendamento pelo WhatsApp com inteligência artificial.',
  alternates: { canonical: '/termos' },
  openGraph: openGraphFor('/termos', 'Termos de Uso', 'Condições de uso do AgendaAgentic.'),
  robots: LEGAL.ready ? undefined : { index: false, follow: true },
}

export default function TermosPage() {
  return (
    <LegalPage title="Termos de Uso">
      <p>
        Estes Termos regulam o uso do <strong>AgendaAgentic</strong>, serviço operado por {LEGAL.razaoSocial},
        inscrita no CNPJ {LEGAL.cnpj} (&quot;AgendaAgentic&quot;, &quot;nós&quot;), pela empresa ou profissional que
        o contrata (&quot;Cliente&quot;) e pelos usuários do painel indicados pelo Cliente. Ao criar uma conta ou
        usar o serviço, o Cliente declara ter lido e aceitado estes Termos e a{' '}
        <Link href="/privacidade">Política de Privacidade</Link>.
      </p>

      <h2>1. O serviço</h2>
      <p>
        O AgendaAgentic é um software, oferecido como serviço, que atende os clientes finais do Cliente pelo
        WhatsApp com o apoio de inteligência artificial. Ele consulta a agenda configurada, propõe horários,
        registra agendamentos confirmados pelo paciente, envia lembretes, mantém fila de espera e encaminha
        cancelamentos, remarcações e pedidos de atendimento humano para aprovação da equipe do Cliente por meio
        de um painel web.
      </p>

      <h2>2. Conta e acesso</h2>
      <ul>
        <li>O Cliente é responsável pelas informações de cadastro e por manter as credenciais de acesso em sigilo.</li>
        <li>O Cliente responde pelas ações realizadas pelos usuários que ele autorizar no painel.</li>
        <li>Suspeitas de acesso indevido devem ser comunicadas imediatamente a {LEGAL.emailContato}.</li>
      </ul>

      <h2>3. Responsabilidades do Cliente</h2>
      <ul>
        <li>
          Utilizar um número e uma conta do <strong>WhatsApp Business</strong> próprios e cumprir as políticas da
          Meta, incluindo a obtenção de consentimento (opt-in) para mensagens iniciadas pela empresa e o uso de
          modelos de mensagem aprovados.
        </li>
        <li>
          Atuar como controlador dos dados dos seus pacientes e clientes finais, definindo a base legal do
          tratamento e informando-os sobre o uso do assistente, nos termos da LGPD.
        </li>
        <li>Manter atualizados os serviços, profissionais, horários e bloqueios cadastrados.</li>
        <li>Acompanhar o painel e responder às aprovações pendentes em tempo razoável.</li>
        <li>
          Garantir que sua comunicação com pacientes respeite as normas do respectivo conselho profissional
          (por exemplo, CFM, CFO e outros).
        </li>
      </ul>

      <h2>4. Inteligência artificial e seus limites</h2>
      <ul>
        <li>
          O assistente usa inteligência artificial e pode interpretar mensagens de forma imprecisa. Por isso, o
          agendamento só é efetivado quando o paciente confirma, e as exceções passam pela equipe do Cliente.
        </li>
        <li>
          O assistente <strong>não presta orientação médica ou de saúde</strong>, não emite diagnóstico e não
          substitui o atendimento profissional. Em situações de urgência aparente, ele orienta a procurar
          atendimento de emergência.
        </li>
        <li>
          O assistente recusa pedidos fora do escopo de agendamento, ações em massa e tentativas de alterar seu
          funcionamento.
        </li>
      </ul>

      <h2>5. Uso proibido</h2>
      <p>É proibido usar o serviço para:</p>
      <ul>
        <li>enviar mensagens em massa sem consentimento (spam) ou contrariar as políticas do WhatsApp;</li>
        <li>tratar dados pessoais sem base legal ou para finalidades ilícitas;</li>
        <li>tentar burlar mecanismos de segurança, acessar dados de outros Clientes ou sobrecarregar o sistema;</li>
        <li>copiar, revender ou fazer engenharia reversa do software sem autorização.</li>
      </ul>

      <h2>6. Planos, pagamento e custos de terceiros</h2>
      <ul>
        <li>Os valores, a franquia de uso e a forma de pagamento são os do plano ou proposta contratados pelo Cliente.</li>
        <li>
          Custos cobrados diretamente por terceiros, como as tarifas da Meta pelo envio de mensagens e, quando
          contratado dessa forma, o consumo de inteligência artificial em conta própria do Cliente, são de
          responsabilidade do Cliente.
        </li>
        <li>O atraso no pagamento pode levar à suspensão do serviço após aviso prévio de [PRAZO] dias.</li>
      </ul>

      <h2>7. Disponibilidade e suporte</h2>
      <p>
        Empregamos esforços razoáveis para manter o serviço disponível, mas ele depende de serviços de terceiros,
        como o WhatsApp, os provedores de inteligência artificial e a hospedagem, e pode sofrer interrupções.
        Manutenções programadas serão comunicadas sempre que possível. O suporte é prestado por {LEGAL.emailContato}.
      </p>

      <h2>8. Dados pessoais</h2>
      <p>
        O tratamento de dados pessoais segue a <Link href="/privacidade">Política de Privacidade</Link>. Em
        relação aos dados dos pacientes e clientes finais, o AgendaAgentic atua como operador e segue as
        instruções do Cliente, que é o controlador.
      </p>

      <h2>9. Propriedade intelectual</h2>
      <p>
        O software, a marca e os materiais do AgendaAgentic pertencem a {LEGAL.razaoSocial}. O Cliente recebe uma
        licença de uso não exclusiva e intransferível enquanto durar a contratação. Os dados inseridos pelo
        Cliente continuam sendo do Cliente.
      </p>

      <h2>10. Limitação de responsabilidade</h2>
      <p>
        Na máxima extensão permitida pela lei, o AgendaAgentic não responde por danos indiretos, lucros cessantes
        ou perdas decorrentes de falhas de serviços de terceiros, de informações incorretas cadastradas pelo
        Cliente ou do descumprimento destes Termos pelo Cliente. A responsabilidade total do AgendaAgentic fica
        limitada ao valor pago pelo Cliente nos [NÚMERO] meses anteriores ao evento.
      </p>

      <h2>11. Cancelamento</h2>
      <ul>
        <li>O Cliente pode cancelar a qualquer momento, sem multa, conforme o plano contratado.</li>
        <li>Após o cancelamento, o Cliente pode solicitar a exportação dos seus dados em até [PRAZO] dias. Depois desse prazo, os dados são excluídos, salvo obrigação legal de guarda.</li>
        <li>Podemos encerrar a conta em caso de violação destes Termos, com aviso prévio quando possível.</li>
      </ul>

      <h2>12. Alterações destes Termos</h2>
      <p>
        Podemos atualizar estes Termos. Mudanças relevantes serão comunicadas com antecedência mínima de [PRAZO]
        dias. O uso continuado do serviço após a vigência indica concordância com a nova versão.
      </p>

      <h2>13. Lei aplicável e foro</h2>
      <p>
        Estes Termos são regidos pelas leis brasileiras. Fica eleito o foro da comarca de {LEGAL.foro} para
        resolver eventuais controvérsias, ressalvadas as hipóteses em que a lei determine foro diverso.
      </p>

      <h2>14. Contato</h2>
      <p>{LEGAL.razaoSocial} — {LEGAL.emailContato}</p>
    </LegalPage>
  )
}
