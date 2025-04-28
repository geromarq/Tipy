import { DatabaseSetup } from "./database-setup"

export default function AdminPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Administración</h1>
      <div className="max-w-2xl">
        <DatabaseSetup />
      </div>
    </div>
  )
}
