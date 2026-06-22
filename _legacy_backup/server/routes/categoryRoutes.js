import express from 'express';
import { addCategory, listCategories, updateCategory } from '../repositories/categoriesRepository.js';
import { canEdit } from '../middleware/roleMiddleware.js';

export const categoryRoutes = express.Router();
categoryRoutes.get('/', (req, res) => res.json(listCategories()));
categoryRoutes.post('/', canEdit, (req, res) => res.json(addCategory(req.body)));
categoryRoutes.put('/:id', canEdit, (req, res) => res.json(updateCategory(req.params.id, req.body)));
