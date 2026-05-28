export function Footer() {
  return (
    <footer className="border-t border-navy-100 bg-white transition-colors dark:border-dark-border dark:bg-dark-surface">
      <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6">
        <p className="text-center text-xs leading-relaxed text-navy-700 dark:text-gibelo-cinza-quente">
          <span className="font-semibold tracking-wide text-navy-700 dark:text-gibelo-offwhite">
            Gibelo Construtora
          </span>{" "}
          · Gibelo Engenharia Ltda · CNPJ 59.175.002/0001-64 · CREA-SP 2594080
        </p>
      </div>
    </footer>
  );
}
