import puppeteer from 'puppeteer'

function getUrl(pageNumber: number) {
  return `https://collections.lib.uwm.edu/digital/collection/agdm/search/searchterm//page/${
    pageNumber + 1
  }`
}

export default async function* scrape() {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  let pageNumber = 0

  while (true) {
    let url = getUrl(pageNumber)

    console.log(`Fetching ${url}`)

    await page.goto(url, { timeout: 30000 * 10 })
    await page.waitForSelector('.Search-mainContent')

    const results = await page.$$('.SearchResult-container')

    for (const result of results) {
      const title = await result.$eval(
        '.MetadataFields-header',
        (h2) => h2.textContent
      )

      const href = await page.evaluate(
        (result) => result.getAttribute('href'),
        result
      )

      // Example href: /digital/collection/agdm/id/5852/rec/20
      const match = href.match(/agdm\/id\/(?<id>\w+)\//)
      const id = match?.groups?.id

      if (id && title) {
        const manifestId = `https://collections.lib.uwm.edu/iiif/info/agdm/${id}/manifest.json`
        const imageId = `https://collections.lib.uwm.edu/digital/iiif/agdm/${id}`

        yield {
          title,
          manifestId,
          imageId
        }
      }
    }

    if (results.length) {
      pageNumber++
    } else {
      break
    }
  }

  await browser.close()
}
