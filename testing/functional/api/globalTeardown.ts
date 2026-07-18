import { stopApi } from './helpers'

export default async function globalTeardown() {
  await stopApi()
}
