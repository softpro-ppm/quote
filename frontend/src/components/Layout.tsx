import { Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BottomNav from './BottomNav'

export default function Layout() {
  const { user } = useAuth()

  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      <header className="sticky top-0 z-40 bg-[#0a3d62] text-white shadow safe-top">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-base font-semibold leading-tight">SBI General</p>
            <p className="text-xs text-sky-200">Motor OD Quote</p>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-sky-100">{user?.username}</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-4 pb-24">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  )
}
