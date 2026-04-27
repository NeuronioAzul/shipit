import { useNavigate } from 'react-router-dom'

const shortcuts = [
  { key: 'Ctrl+N', action: 'Criar nova atividade' },
  { key: 'Ctrl+S', action: 'Salvar o contexto da tela atual' },
  { key: 'Ctrl+F', action: 'Focar na busca global' },
  { key: 'Ctrl+K', action: 'Abrir busca rápida de atividades' },
  { key: 'Ctrl+Q', action: 'Encerrar o aplicativo' },
  { key: 'Alt+ArrowLeft / Alt+ArrowRight', action: 'Navegar pelo histórico de telas' },
]

export function UserManualPage() {
  const navigate = useNavigate()

  return (
    <div id="manual-page" className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          id="manual-btn-back"
          type="button"
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          title="Voltar"
          aria-label="Voltar para a tela anterior"
        >
          <i className="fa-solid fa-arrow-left text-lg" aria-hidden="true"></i>
        </button>
        <h1 className="text-2xl font-bold">Manual do Usuário</h1>
      </div>

      <section className="bg-card border border-border rounded-lg p-5 space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <i className="fa-solid fa-rocket text-primary" aria-hidden="true"></i>
          Primeiros passos
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          O ShipIt! foi desenhado para registrar atividades ao longo do mês e gerar o relatório final em DOCX com evidências.
          O fluxo recomendado é: preencher perfil, criar atividades, anexar evidências e gerar relatório no dashboard.
        </p>
      </section>

      <section className="bg-card border border-border rounded-lg p-5 space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <i className="fa-solid fa-list-check text-primary" aria-hidden="true"></i>
          Fluxo recomendado
        </h2>
        <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
          <li>Cadastre ou revise seu perfil em Perfil.</li>
          <li>Use Atividades para criar os registros do mês.</li>
          <li>Anexe evidências de imagem ou texto em cada atividade.</li>
          <li>Revise os status e campos obrigatórios no fim do mês.</li>
          <li>Gere o relatório DOCX no Dashboard.</li>
        </ol>
      </section>

      <section className="bg-card border border-border rounded-lg p-5 space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <i className="fa-solid fa-keyboard text-primary" aria-hidden="true"></i>
          Atalhos úteis
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-4 font-semibold text-foreground">Atalho</th>
                <th className="py-2 font-semibold text-foreground">Ação</th>
              </tr>
            </thead>
            <tbody>
              {shortcuts.map((item) => (
                <tr key={item.key} className="border-b border-border/50 last:border-b-0">
                  <td className="py-2 pr-4 text-primary font-medium">{item.key}</td>
                  <td className="py-2 text-muted-foreground">{item.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-card border border-border rounded-lg p-5 space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <i className="fa-solid fa-circle-question text-primary" aria-hidden="true"></i>
          FAQ
        </h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div>
            <p className="text-foreground font-medium">Onde ficam minhas evidências?</p>
            <p>As evidências são armazenadas no diretório de dados do aplicativo. Use o menu File para abrir a pasta de evidências.</p>
          </div>
          <div>
            <p className="text-foreground font-medium">Posso trocar a pasta de relatórios?</p>
            <p>Sim. Vá em Configurações e altere o diretório de relatórios conforme sua preferência.</p>
          </div>
          <div>
            <p className="text-foreground font-medium">Como envio feedback ou bugs?</p>
            <p>Use Help &gt; Reportar um Problema para abrir a página de issues do projeto no GitHub.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
