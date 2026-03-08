import { useEffect, useRef } from 'react'

export default function NeuralBG() {
    const ref = useRef(null)

    useEffect(() => {
        const c = ref.current
        if (!c) return
        const ctx = c.getContext('2d')
        let w, h, pts = [], frame

        const resize = () => {
            w = c.width = window.innerWidth
            h = c.height = window.innerHeight
        }
        resize()
        window.addEventListener('resize', resize)

        for (let i = 0; i < 45; i++) {
            pts.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                r: Math.random() * 2 + 0.5,
                a: Math.random() * 0.5 + 0.2,
            })
        }

        const draw = () => {
            ctx.clearRect(0, 0, w, h)
            for (let p of pts) {
                p.x += p.vx; p.y += p.vy
                if (p.x < 0) p.x = w; if (p.x > w) p.x = 0
                if (p.y < 0) p.y = h; if (p.y > h) p.y = 0
                ctx.beginPath()
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(0,240,200,${p.a})`
                ctx.fill()
            }
            for (let i = 0; i < pts.length; i++) {
                for (let j = i + 1; j < pts.length; j++) {
                    const dx = pts[i].x - pts[j].x
                    const dy = pts[i].y - pts[j].y
                    const d = Math.sqrt(dx * dx + dy * dy)
                    if (d < 140) {
                        ctx.beginPath()
                        ctx.moveTo(pts[i].x, pts[i].y)
                        ctx.lineTo(pts[j].x, pts[j].y)
                        ctx.strokeStyle = `rgba(0,240,200,${0.07 * (1 - d / 140)})`
                        ctx.lineWidth = 0.5
                        ctx.stroke()
                    }
                }
            }
            frame = requestAnimationFrame(draw)
        }
        draw()

        return () => {
            cancelAnimationFrame(frame)
            window.removeEventListener('resize', resize)
        }
    }, [])

    return <canvas ref={ref} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />
}
