import { CompanyContextBar, CompanyGate } from '@/features/companies/CompanySelector'
import { useModuleAccess } from '@/features/companies/useModuleAccess'
import { CndCard } from './components/CndCard'
import { DueCalendarCard } from './components/DueCalendarCard'
import { NewsCard } from './components/NewsCard'
import { RecentDocumentsCard } from './components/RecentDocumentsCard'

export function HomePage() {
  const { can } = useModuleAccess()
  const documents = can('Documentos')

  return (
    <>
      <CompanyContextBar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <CompanyGate purpose="ver o resumo de vencimentos, notícias e documentos">
          {(company) => (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
              {documents && <DueCalendarCard companyId={company.id} />}
              <div className="space-y-6">
                <NewsCard companyId={company.id} />
                <CndCard companyId={company.id} />
              </div>
              {documents && (
                <div className="md:col-span-2 xl:col-span-1">
                  <RecentDocumentsCard companyId={company.id} />
                </div>
              )}
            </div>
          )}
        </CompanyGate>
      </main>
    </>
  )
}
