import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

const APP_NAME = 'ShipIt!'
const PROJECT_SITE_URL = 'https://github.com/NeuronioAzul/shipit#readme'
const PROJECT_REPOSITORY_URL = 'https://github.com/NeuronioAzul/shipit'
const PROJECT_ISSUES_URL = 'https://github.com/NeuronioAzul/shipit/issues'
const PROJECT_CONTACT_EMAIL = 'mailto:mauro.rocha.t@gmail.com'

const PIX_DONATION_URL = 'https://nubank.com.br/cobrar/2w3xk/6a164c4f-fd89-47de-92bf-4bae2c2d90b8'
const PIX_KEY = '3536a7e9-0d0c-4532-9a52-30ca23b268fb'
const PIX_QR_CODE = '00020126780014BR.GOV.BCB.PIX01363536a7e9-0d0c-4532-9a52-30ca23b268fb0216Valeu, obrigado!520400005303986540525.005802BR5919Mauro Rocha Tavares6009SAO PAULO62140510yg0o2mR2AO6304DE4F'

async function copyToClipboard(text: string, label: string) {
  if (!navigator.clipboard?.writeText) {
    toast.error('Seu ambiente não permite copiar automaticamente.')
    return
  }

  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${label} copiado com sucesso.`)
  } catch {
    toast.error(`Não foi possível copiar ${label.toLowerCase()}.`)
  }
}

export function AboutPage() {
  const navigate = useNavigate()
  const [version, setVersion] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadVersion() {
      try {
        const appVersion = await window.electronAPI?.getVersion?.()
        if (!isMounted) return
        setVersion(appVersion ?? 'Modo navegador')
      } catch {
        if (!isMounted) return
        setVersion('Indisponível')
      }
    }

    void loadVersion()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div id="about-page" className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          id="about-btn-back"
          type="button"
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          title="Voltar"
          aria-label="Voltar para a tela anterior"
        >
          <i className="fa-solid fa-arrow-left text-lg" aria-hidden="true"></i>
        </button>
        <h1 id="about-title" className="text-2xl font-bold">Sobre o ShipIt!</h1>
      </div>

      <section className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <img
            src="./assets/images/icons/favicon-96x96.png"
            alt=""
            aria-hidden="true"
            className="w-5 h-5 object-contain"
            draggable={false}
          />
          Por que ShipIt!?
        </h2>

        <div className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">A Origem do Nome</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            No universo da tecnologia, "Ship it!" é uma expressão usada quando um projeto finalmente fica pronto
            e ganha o mundo. É o momento de orgulho em que o trabalho duro se transforma em entrega real.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Nós trouxemos esse conceito para a sua rotina. O <span className="text-foreground font-medium">{APP_NAME}</span> nasceu
            para transformar a forma como você documenta a sua jornada profissional e consolida os seus resultados.
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">A Nossa História e Propósito</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Sabemos que o final do mês costuma ser sinônimo de correria. Lembrar de tudo o que foi feito nas últimas
            semanas, recuperar prints de telas e organizar descrições de atividades pode se tornar um desafio exaustivo.
            Muitas vezes, o valor do seu esforço diário se perde na falta de registro.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O <span className="text-foreground font-medium">{APP_NAME}</span> foi criado para mudar essa dinâmica. Ele é o seu diário
            de bordo profissional. Dia após dia, atividade por atividade, você centraliza suas entregas, anexa suas evidências
            e organiza seu progresso de forma simples e intuitiva.
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">O Seu Momento "ShipIt!"</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            No final do mês, a mágica acontece. Em vez de gastar horas montando apresentações ou relatórios do zero,
            você está a apenas um clique de distância da sua entrega.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O app consolida todas as suas descrições e prints em um relatório impecável, profissional e pronto para os
            seus gestores ou clientes.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Registrar é construir. Gerar o relatório é celebrar. Trabalho concluído, evidências salvas e... ShipIt!
          </p>
        </div>
      </section>

      <section className="bg-card border border-border rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <i className="fa-solid fa-hand-holding-heart text-primary" aria-hidden="true"></i>
            Apoie o projeto
          </h2>
          <a
            id="about-btn-donate"
            href={PIX_DONATION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
          >
            <i className="fa-solid fa-heart" aria-hidden="true"></i>
            Doar
            <span className="text-primary-foreground/85 text-xs">Support Us</span>
          </a>
        </div>

        <p className="text-sm text-muted-foreground">
          Está gostando do {APP_NAME}? Considere apoiar o projeto com uma doação via Pix. <br />
          Qualquer valor é bem-vindo e faz uma grande diferença!<br />
          Sua contribuição ajuda a manter o ShipIt ativo, evoluindo com novos recursos e melhorias para toda a comunidade.
        </p>

        <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
          <div className="rounded-lg border border-border bg-background p-3 space-y-3">
            <img
              id="about-pix-qr"
              src="./assets/images/qrpixnu.png"
              alt="QR code Pix para doação ao projeto ShipIt"
              className="w-full max-w-64 mx-auto rounded-md"
            />
            <p className="text-xs text-muted-foreground text-center">
              Escaneie o QR Code do PIX para doar de forma rápida pelo app do seu banco.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-background p-3 space-y-2">
              <p className="text-sm text-foreground font-medium">URL da página Pix</p>
              <p id="about-pix-url" className="text-xs text-muted-foreground break-all">{PIX_DONATION_URL}</p>
            </div>

            <div className="rounded-lg border border-border bg-background p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-foreground font-medium">Chave Pix aleatória</p>
                <button
                  id="about-copy-key"
                  type="button"
                  onClick={() => { void copyToClipboard(PIX_KEY, 'Chave Pix') }}
                  className="h-8 px-3 rounded-md border border-border text-xs text-foreground hover:bg-muted/70 transition-colors"
                >
                  Copiar chave
                </button>
              </div>
              <p id="about-pix-key" className="text-xs text-muted-foreground break-all">{PIX_KEY}</p>
            </div>

            <div className="rounded-lg border border-border bg-background p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-foreground font-medium">Código Pix (copia e cola)</p>
                <button
                  id="about-copy-code"
                  type="button"
                  onClick={() => { void copyToClipboard(PIX_QR_CODE, 'Código Pix') }}
                  className="h-8 px-3 rounded-md border border-border text-xs text-foreground hover:bg-muted/70 transition-colors"
                >
                  Copiar código
                </button>
              </div>
              <pre
                id="about-pix-code"
                className="text-[11px] leading-relaxed text-muted-foreground bg-muted/50 border border-border/70 rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all"
              >
                {PIX_QR_CODE}
              </pre>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <i className="fa-solid fa-users text-primary" aria-hidden="true"></i>
          Projeto e Comunidade
        </h2>

        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <a
            id="about-link-site"
            href={PROJECT_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-background border border-border/70 rounded-md p-3 text-muted-foreground hover:border-primary/60 hover:text-foreground transition-colors"
          >
            <p className="text-foreground font-medium">Site do projeto</p>
            <p className="break-all">{PROJECT_SITE_URL}</p>
          </a>

          <a
            id="about-link-repository"
            href={PROJECT_REPOSITORY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-background border border-border/70 rounded-md p-3 text-muted-foreground hover:border-primary/60 hover:text-foreground transition-colors"
          >
            <p className="text-foreground font-medium">Repositório oficial (GitHub)</p>
            <p className="break-all">{PROJECT_REPOSITORY_URL}</p>
          </a>

          <a
            id="about-link-issues"
            href={PROJECT_ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-background border border-border/70 rounded-md p-3 text-muted-foreground hover:border-primary/60 hover:text-foreground transition-colors"
          >
            <p className="text-foreground font-medium">Contribuições e suporte</p>
            <p className="break-all">{PROJECT_ISSUES_URL}</p>
          </a>

          <a
            id="about-link-contact"
            href={PROJECT_CONTACT_EMAIL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-background border border-border/70 rounded-md p-3 text-muted-foreground hover:border-primary/60 hover:text-foreground transition-colors"
          >
            <p className="text-foreground font-medium">Contato</p>
            <p>mauro.rocha.t@gmail.com</p>
          </a>
        </div>
      </section>

      <section className="bg-card border border-border rounded-lg p-5 space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <i className="fa-solid fa-circle-info text-primary" aria-hidden="true"></i>
          Aplicativo
        </h2>

        <div className="grid gap-3 sm:grid-cols-2 text-sm text-muted-foreground">
          <div className="bg-background border border-border/70 rounded-md p-3">
            <p className="text-foreground font-medium">Nome</p>
            <p>{APP_NAME}</p>
          </div>
          <div className="bg-background border border-border/70 rounded-md p-3">
            <p className="text-foreground font-medium">Versão</p>
            <p id="about-version">{version || 'Carregando...'}</p>
          </div>
        </div>
      </section>

    </div>
  )
}
