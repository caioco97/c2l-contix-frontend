import { Spinner } from '@/components/ui'
import { CompanyBanner } from '@/features/companies/CompanyBanner'
import { useActiveCompany } from '@/features/companies/ActiveCompanyContext'
import { CndCard } from './components/CndCard'
import { DueCalendarCard } from './components/DueCalendarCard'
import { NewsCard } from './components/NewsCard'
import { RecentDocumentsCard } from './components/RecentDocumentsCard'

export function HomePage() {
  const { company } = useActiveCompany()

  return (
    <>
      <CompanyBanner />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {!company ? (
          <Spinner />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
            <DueCalendarCard companyId={company.id} />
            <div className="space-y-6">
              <NewsCard companyId={company.id} />
              <CndCard companyId={company.id} />
            </div>
            <div className="md:col-span-2 xl:col-span-1">
              <RecentDocumentsCard companyId={company.id} />
            </div>
          </div>
        )}
      </main>
    </>
  )
}
