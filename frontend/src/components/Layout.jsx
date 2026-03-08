import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import NeuralBG from './NeuralBG'

export default function Layout() {
    return (
        <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
            <NeuralBG />
            <Sidebar />
            <main style={{
                flex: 1, padding: '36px 44px', maxWidth: 940,
                overflowY: 'auto', position: 'relative', zIndex: 5,
            }}>
                <Outlet />
            </main>
        </div>
    )
}
