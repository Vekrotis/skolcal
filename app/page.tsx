export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">Vítejte ve Skolcal</h1>
        <p className="text-center text-lg mb-8">
          Propojte si rozvrh ze Školy OnLine přímo do svého Google Kalendáře, nebo si vygenerujte vlastní .ics soubor!
        </p>
        <div className="flex justify-center space-x-4">
          <a
            href="/dashboard"
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-8 sm:px-10"
          >
            Přejít do panelu
          </a>
        </div>
      </div>
    </main>
  )
}
