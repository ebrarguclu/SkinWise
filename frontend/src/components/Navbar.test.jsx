import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { routerFuture } from '../test/setup.js'
import Navbar from './Navbar.jsx'

// The navbar reads the cart, the logged-in user and toasts. Tests use simple fakes.
vi.mock('../context/CartContext.jsx', () => ({ useCart: () => ({ count: 2 }) }))
vi.mock('../context/AuthContext.jsx', () => ({ useAuth: () => ({ user: null, logout: vi.fn() }) }))
vi.mock('../context/ToastContext.jsx', () => ({ useToast: () => ({ info: vi.fn() }) }))

const renderNavbar = () => render(<MemoryRouter future={routerFuture}><Navbar /></MemoryRouter>)

describe('Navbar mobile menu', () => {
  test('the menu button opens and closes the menu', async () => {
    renderNavbar()
    const burger = screen.getByRole('button', { name: 'Open menu' })
    const menu = screen.getByRole('navigation', { name: 'Main' })
    expect(burger).toHaveAttribute('aria-expanded', 'false')
    expect(menu).not.toHaveClass('open')

    await userEvent.click(burger)
    expect(burger).toHaveAttribute('aria-expanded', 'true')
    expect(burger).toHaveAccessibleName('Close menu')
    expect(menu).toHaveClass('open')

    await userEvent.click(burger)
    expect(menu).not.toHaveClass('open')
  })

  test('Escape closes the open menu', async () => {
    renderNavbar()
    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('navigation', { name: 'Main' })).not.toHaveClass('open')
  })

  test('choosing a link closes the menu', async () => {
    renderNavbar()
    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    await userEvent.click(screen.getByRole('link', { name: 'Shop' }))
    expect(screen.getByRole('navigation', { name: 'Main' })).not.toHaveClass('open')
  })

  test('shows the cart count and a log in link for guests', () => {
    renderNavbar()
    expect(screen.getByLabelText('2 items')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login')
  })
})
