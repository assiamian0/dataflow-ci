import type { Request, Response } from 'express'
import * as sourceService from '../services/source.service'
import type { CreateSchemaVersionInput, CreateSourceInput } from '../validators/source.validator'

export async function createSource(req: Request, res: Response) {
  const input = req.body as CreateSourceInput
  const source = await sourceService.createSourceWithSchema(req.userId!, input)
  res.status(201).json(source)
}

export async function listSources(req: Request, res: Response) {
  const sources = await sourceService.listSourcesByUser(req.userId!)
  res.json(sources)
}

export async function getSource(req: Request, res: Response) {
  const source = await sourceService.getSourceBySourceId(req.params.sourceId)
  res.json(source)
}

export async function getActiveSchema(req: Request, res: Response) {
  const schema = await sourceService.getActiveSchema(req.params.sourceId)
  res.json(schema)
}

export async function createSchemaVersion(req: Request, res: Response) {
  const { columns, row_constraints } = req.body as CreateSchemaVersionInput
  const schema = await sourceService.createNewSchemaVersion(req.params.sourceId, columns, row_constraints)
  res.status(201).json(schema)
}

export async function listSchemaVersions(req: Request, res: Response) {
  const versions = await sourceService.listSchemaVersions(req.params.sourceId)
  res.json(versions)
}
