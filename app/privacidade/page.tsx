import type { Metadata } from 'next'
import LegalPage from '@/components/legal/LegalPage'
import { LEGAL } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description: 'Como o AgendaAgentic trata dados pessoais de clínicas, usuários e pacientes, em conformidade com a LGPD.',
  alternates: { canonical: '/privacidade' },
  robots: LEGAL.ready ? undefined : { index: false, follow: true },
}

const SUBOPERADORES = [
  ['Supabase', 'Banco de dados e autenticação do painel', 'Dados de conta, agenda, pacientes e conversas'],
  ['Vercel', 'Hospedagem do site e do sistema', 'Dados técnicos de acesso e dados em trânsito'],
  ['Meta (WhatsApp Business Platform)', 'Envio e recebimento de mensagens do WhatsApp', 'Telefone, nome de perfil e conteúdo das mensagens'],
  ['Anthropic', 'Modelo de inteligência artificial que interpreta e responde as mensagens', 'Conteúdo das mensagens e dados de agenda necessários à resposta'],
  ['Groq', 'Transcrição de mensagens de áudio', 'Áudios enviados pelo WhatsApp'],
  ['Langfuse', 'Monitoramento de qualidade e custo das respostas da IA', 'Registros das interações com a IA, incluindo o conteúdo das mensagens'],
]

export default function PrivacidadePage() {
  return (
    <LegalPage title="Política de Privacidade">
      <p>
        Esta Política explica como o <strong>AgendaAgentic</strong>, serviço operado por {LEGAL.razaoSocial},
        inscrita no CNPJ {LEGAL.cnpj}, com sede em {LEGAL.endereco} (&quot;AgendaAgentic&quot;, &quot;nós&quot;),
        trata dados pessoais, em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados — LGPD).
      </p>

      <h2>1. Nosso papel no tratamento de dados</h2>
      <p>O AgendaAgentic atua em dois papéis diferentes, conforme o tipo de dado:</p>
      <ul>
        <li>
          <strong>Controlador</strong> dos dados das empresas que contratam o serviço (clínicas, consultórios e
          outros negócios — &quot;Clientes&quot;), dos usuários do painel e dos visitantes deste site.
        </li>
        <li>
          <strong>Operador</strong> dos dados dos pacientes e clientes finais que conversam com o assistente pelo
          WhatsApp. Esses dados são tratados em nome do Cliente, que é o controlador e define as finalidades do
          tratamento. Dúvidas sobre esses dados devem ser enviadas preferencialmente ao próprio Cliente (a clínica
          ou o estabelecimento); nós o apoiaremos no atendimento.
        </li>
      </ul>

      <h2>2. Quais dados tratamos</h2>
      <h3>Visitantes do site</h3>
      <p>
        Dados técnicos de acesso, como endereço IP, tipo de navegador e páginas acessadas, registrados pela
        infraestrutura de hospedagem para segurança e funcionamento do site.
      </p>
      <h3>Clientes e usuários do painel</h3>
      <ul>
        <li>Nome, e-mail, telefone e cargo de quem usa o painel;</li>
        <li>Dados da empresa e de faturamento;</li>
        <li>Configurações do negócio: serviços, profissionais, horários e bloqueios de agenda;</li>
        <li>Registros de uso do painel, como aprovações e alterações de agendamento.</li>
      </ul>
      <h3>Pacientes e clientes finais (em nome do Cliente)</h3>
      <ul>
        <li>Nome e número de telefone do WhatsApp;</li>
        <li>Conteúdo das mensagens de texto e de áudio (os áudios são transcritos em texto);</li>
        <li>Agendamentos, histórico de atendimentos, fila de espera e, quando informado, o convênio.</li>
      </ul>
      <p>
        Em clínicas e consultórios, as mensagens podem conter <strong>dados pessoais sensíveis referentes à
        saúde</strong> (art. 5º, II, e art. 11 da LGPD). O assistente é instruído a não solicitar informações
        clínicas além do necessário para o agendamento e a não emitir diagnóstico ou orientação de saúde.
      </p>

      <h2>3. Para que usamos os dados e com qual base legal</h2>
      <div className="legal-table">
        <table>
          <thead><tr><th>Finalidade</th><th>Base legal (LGPD)</th></tr></thead>
          <tbody>
            <tr><td>Prestar o serviço contratado: atendimento pelo WhatsApp, agenda e painel</td><td>Execução de contrato (art. 7º, V)</td></tr>
            <tr><td>Agendar, confirmar, lembrar e remarcar atendimentos de pacientes, em nome do Cliente</td><td>Definida pelo Cliente, como controlador (arts. 7º e 11)</td></tr>
            <tr><td>Faturamento e obrigações fiscais</td><td>Cumprimento de obrigação legal (art. 7º, II)</td></tr>
            <tr><td>Segurança, prevenção a fraudes e abuso do assistente</td><td>Legítimo interesse (art. 7º, IX)</td></tr>
            <tr><td>Melhoria da qualidade e do custo das respostas da IA</td><td>Legítimo interesse (art. 7º, IX), com minimização de dados</td></tr>
            <tr><td>Comunicações comerciais aos Clientes</td><td>Legítimo interesse ou consentimento, com opção de descadastro</td></tr>
          </tbody>
        </table>
      </div>

      <h2>4. Uso de inteligência artificial</h2>
      <p>
        As mensagens recebidas pelo WhatsApp são processadas por um modelo de inteligência artificial para
        entender o pedido, consultar a agenda e redigir a resposta. A IA não toma decisões definitivas sozinha:
        o agendamento só é efetivado quando o paciente confirma, e cancelamentos e remarcações passam por
        aprovação da equipe do Cliente. Não usamos os dados dos pacientes para treinar modelos próprios. Os
        provedores de IA tratam os dados conforme seus termos contratuais com o AgendaAgentic.
      </p>

      <h2>5. Com quem compartilhamos</h2>
      <p>
        Não vendemos dados pessoais. Compartilhamos dados apenas com fornecedores (suboperadores) necessários para
        prestar o serviço:
      </p>
      <div className="legal-table">
        <table>
          <thead><tr><th>Fornecedor</th><th>Finalidade</th><th>Dados envolvidos</th></tr></thead>
          <tbody>
            {SUBOPERADORES.map(([nome, finalidade, dados]) => (
              <tr key={nome}><td>{nome}</td><td>{finalidade}</td><td>{dados}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Também podemos compartilhar dados quando exigido por lei, ordem judicial ou autoridade competente.
      </p>

      <h2>6. Transferência internacional</h2>
      <p>
        Alguns fornecedores listados acima armazenam ou processam dados fora do Brasil, inclusive nos Estados
        Unidos. Essas transferências seguem o art. 33 da LGPD e são amparadas por cláusulas contratuais e
        garantias de proteção adequadas oferecidas por esses fornecedores.
      </p>

      <h2>7. Por quanto tempo guardamos</h2>
      <ul>
        <li>Dados de Clientes e usuários: enquanto a conta estiver ativa e, após o encerramento, pelo prazo necessário para cumprir obrigações legais;</li>
        <li>Dados de pacientes, agendamentos e conversas: enquanto o Cliente mantiver a conta ativa, ou pelo prazo que ele definir; após o encerramento, são excluídos em até [PRAZO] dias, salvo obrigação legal de guarda;</li>
        <li>Registros de monitoramento da IA: por até [PRAZO] dias.</li>
      </ul>

      <h2>8. Segurança</h2>
      <p>
        Adotamos medidas técnicas e administrativas para proteger os dados, incluindo conexão criptografada
        (HTTPS), autenticação para acesso ao painel, controle de acesso por conta e fornecedores com criptografia
        de dados armazenados. Nenhum sistema é totalmente imune a incidentes; caso ocorra um incidente relevante,
        comunicaremos os Clientes afetados e a Autoridade Nacional de Proteção de Dados (ANPD), nos termos da lei.
      </p>

      <h2>9. Cookies e armazenamento no navegador</h2>
      <p>
        Usamos apenas recursos essenciais: cookies e armazenamento local para manter a sessão de login no painel
        e lembrar preferências, como o tema claro ou escuro. Não usamos cookies de publicidade neste site.
      </p>

      <h2>10. Seus direitos</h2>
      <p>Nos termos do art. 18 da LGPD, o titular pode solicitar:</p>
      <ul>
        <li>confirmação da existência de tratamento e acesso aos dados;</li>
        <li>correção de dados incompletos, inexatos ou desatualizados;</li>
        <li>anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade;</li>
        <li>portabilidade dos dados;</li>
        <li>informação sobre com quem os dados foram compartilhados;</li>
        <li>revogação do consentimento, quando essa for a base legal.</li>
      </ul>
      <p>
        Para exercer seus direitos, escreva para {LEGAL.encarregadoEmail}. Se você é paciente ou cliente de um
        estabelecimento que usa o AgendaAgentic, também pode procurar diretamente esse estabelecimento. Você
        também pode apresentar reclamação à ANPD.
      </p>

      <h2>11. Encarregado pelo tratamento de dados (DPO)</h2>
      <p>
        {LEGAL.encarregadoNome} — {LEGAL.encarregadoEmail}
      </p>

      <h2>12. Alterações desta Política</h2>
      <p>
        Podemos atualizar esta Política para refletir mudanças no serviço ou na legislação. A data da última
        atualização fica no topo da página. Mudanças relevantes serão comunicadas aos Clientes.
      </p>

      <h2>13. Contato</h2>
      <p>{LEGAL.razaoSocial} — {LEGAL.emailContato}</p>
    </LegalPage>
  )
}
