import { useState } from 'react'
import { ShiftForm } from './components/ShiftForm'
import { DashboardEngine } from './components/DashboardEngine'
import { LayoutDashboard, ClipboardList, LogOut, Bell } from 'lucide-react'

function App() {
  const [activeTab, setActiveTab] = useState<'form' | 'dashboard'>('form')

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header / Navbar */}
      <nav style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '3rem',
        padding: '1rem 0',
        borderBottom: '1px solid var(--glass-border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ 
            background: 'var(--accent)', 
            width: '40px', 
            height: '40px', 
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0f172a'
          }}>
            <ClipboardList size={24} />
          </div>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>ShiftFlow</h1>
        </div>

        <div style={{ display: 'flex', gap: '2rem' }}>
          <button 
            onClick={() => setActiveTab('form')}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: activeTab === 'form' ? 'var(--accent)' : 'white',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: activeTab === 'form' ? 1 : 0.6,
              transition: 'all 0.2s'
            }}
          >
            <ClipboardList size={18} /> Cambio de Turno
          </button>
          <button 
            onClick={() => setActiveTab('dashboard')}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: activeTab === 'dashboard' ? 'var(--accent)' : 'white',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: activeTab === 'dashboard' ? 1 : 0.6,
              transition: 'all 0.2s'
            }}
          >
            <LayoutDashboard size={18} /> Dashboards
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Bell size={20} style={{ opacity: 0.6, cursor: 'pointer' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#334155' }}></div>
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Admin</span>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {activeTab === 'form' ? (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <ShiftForm />
          </div>
        ) : (
          <DashboardEngine />
        )}
      </main>

      {/* Footer */}
      <footer style={{ marginTop: '4rem', padding: '2rem 0', borderTop: '1px solid var(--glass-border)', textAlign: 'center', opacity: 0.5 }}>
        <p>© 2026 ShiftFlow Pro - Sistema de Gestión Operacional</p>
      </footer>
    </div>
  )
}

export default App
