import { request } from './client.js'

// GET /categories -> [{ id, name, slug, icon }]
export const fetchCategories = () => request('/categories')
