import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { routerFuture } from '../test/setup.js'
import Button from './Button.jsx'
import FormField from './FormField.jsx'
import Loader from './Loader.jsx'
import ErrorMessage from './ErrorMessage.jsx'

describe('Button', () => {
  test('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save</Button>)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  test('is disabled and cannot be clicked while loading', async () => {
    const onClick = vi.fn()
    render(<Button loading onClick={onClick}>Log in</Button>)
    const button = screen.getByRole('button', { name: 'Log in' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  test('renders a link with button styles when "to" is given', () => {
    render(<MemoryRouter future={routerFuture}><Button to="/products" variant="outline">Shop</Button></MemoryRouter>)
    const link = screen.getByRole('link', { name: 'Shop' })
    expect(link).toHaveAttribute('href', '/products')
    expect(link).toHaveClass('btn', 'btn-outline')
  })
})

describe('FormField', () => {
  test('connects the label to the input', async () => {
    render(<FormField label="Email" type="email" />)
    const input = screen.getByLabelText('Email')
    await userEvent.type(input, 'a@b.com')
    expect(input).toHaveValue('a@b.com')
  })

  test('shows the error and marks the input invalid', () => {
    render(<FormField label="Password" type="password" error="Password is too short" />)
    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    // Screen readers read the error together with the field.
    expect(input).toHaveAccessibleDescription('Password is too short')
  })

  test('has no error state when there is no error', () => {
    render(<FormField label="Name" />)
    expect(screen.getByLabelText('Name')).not.toHaveAttribute('aria-invalid')
  })
})

describe('Loader and ErrorMessage', () => {
  test('Loader announces its text as a status', () => {
    render(<Loader label="Loading products…" />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading products…')
  })

  test('ErrorMessage is an alert and shows a retry button only when onRetry is given', async () => {
    const onRetry = vi.fn()
    const { rerender } = render(<ErrorMessage title="Could not load" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()

    rerender(<ErrorMessage title="Could not load" onRetry={onRetry} />)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
