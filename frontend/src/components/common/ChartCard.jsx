export default function ChartCard({ title, subtitle, actions, children, footer }) {
  return (
    <section className="card-surface flex flex-col p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      <div className="mt-5 min-w-0">{children}</div>
      {footer ? <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">{footer}</div> : null}
    </section>
  );
}
