import { useId } from 'react'

// Shared form field: label + input (or textarea/select) + hint + error message.
//   <FormField label="Email" type="email" value={email} onChange={...} error={errors.email} />
//   <FormField label="Address" as="textarea" rows={3} ... />
//   <FormField label="Skin type" as="select" ...><option>Dry</option></FormField>
// Every other prop (value, onChange, type, placeholder…) goes straight to the input.
// The error text is linked to the input with aria-describedby, so screen readers read it.
export default function FormField({
  label,
  as: Control = 'input',
  error,
  hint,
  required = false,
  id,
  children,
  ...inputProps
}) {
  const autoId = useId()
  const inputId = id || autoId
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="field">
      <label htmlFor={inputId} className="field-label">
        {label}
        {required && <span className="field-required" aria-hidden="true">*</span>}
      </label>
      <Control
        id={inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...inputProps}
      >
        {children}
      </Control>
      {hint && <small id={hintId} className="field-hint">{hint}</small>}
      {error && <p id={errorId} className="field-error">{error}</p>}
    </div>
  )
}
