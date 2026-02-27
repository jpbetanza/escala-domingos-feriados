import { LoginButton } from './login-button'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm mx-auto p-6 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Escala Loja</h1>
          <p className="text-muted-foreground text-sm">
            Cronograma de vendedores para domingos e feriados
          </p>
        </div>

        <div className="border rounded-xl p-6 space-y-4 bg-card">
          <p className="text-sm text-center text-muted-foreground">
            Entre com sua conta Google para acessar o app.
          </p>
          <LoginButton />
        </div>
      </div>
    </div>
  )
}
