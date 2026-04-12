interface EmptyStateProps {
  onCreateProfile: () => void
}

export function EmptyState({ onCreateProfile }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] gap-8 select-none">
      <img
        src="./assets/images/icon-foguete-logo-tons-cinza.svg"
        alt="ShipIt! Foguete"
        className="w-40 h-40 opacity-30"
        draggable={false}
      />

      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold text-foreground mb-3">
          Bem-vindo ao Ship<span className="text-accent">It!</span>
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          Automatize a criação do seu Relatório Mensal de Atividades.
          Comece configurando seu perfil.
        </p>
      </div>

      <button
        onClick={onCreateProfile}
        className="px-8 py-3 bg-accent text-accent-foreground font-semibold rounded-lg
          hover:opacity-90 transition-all cursor-pointer shadow-lg hover:shadow-xl
          flex items-center gap-3 text-lg"
      >
        <i className="fa-solid fa-user-plus"></i>
        Criar Perfil
      </button>
    </div>
  )
}
