import fs from 'fs'
import { parseArgs } from 'util'
import { Glob } from 'bun'

const { positionals } = parseArgs({
  args: Bun.argv,
  strict: true,
  allowPositionals: true
})

const scrapers = positionals.slice(2)

const glob = new Glob('./organizations/**/*.ts')

let foundScraper = false
let availableScrapers: string[] = []

for await (const file of glob.scan('.')) {
  const match = file.match(/organizations\/(?<id>\w+).ts/)
  const organizationId = match?.groups?.id

  if (scrapers.length) {
    if (organizationId && scrapers.includes(organizationId)) {
      foundScraper = true
      console.log(`Scraping ${organizationId}...`)

      const { default: scrape } = await import(file)
      const stream = fs.createWriteStream(
        `./data/${organizationId}.ndjson`,
        'utf8'
      )

      for await (const item of await scrape()) {
        const itemWithOrganizationId = { organizationId, ...item }
        console.log(itemWithOrganizationId)
        stream.write(`${JSON.stringify(itemWithOrganizationId)}\n`)
      }

      stream.end()
    }
  } else if (organizationId) {
    availableScrapers.push(organizationId)
  }
}

if (!foundScraper) {
  console.log('Available scrapers:')
  console.log(availableScrapers.map((id) => `  - ${id}`).join('\n'))
}
