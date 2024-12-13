import puppeteer from 'puppeteer'

function getUrl(pageNumber: number) {
  return `https://collections.leventhalmap.org/search?page=${
    pageNumber + 1
  }&q=&utf8=%E2%9C%93`
}

export default async function* scrape() {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  let pageNumber = 0

  while (true) {
    let url = getUrl(pageNumber)

    console.log(`Fetching ${url}`)

    await page.goto(url, { timeout: 30000 * 10 })

    await page.waitForSelector('#documents')

    const results = await page.$$('#documents .document')

    for (const result of results) {
      const href = await result.$eval('.index_title a', (a) =>
        a.getAttribute('href')
      )

      const thumbnail = await result.$eval('.thumbnail img', (img) => ({
        title: img.getAttribute('alt'),
        src: img.getAttribute('src')
      }))

      // Example URL:
      //   https://collections.leventhalmap.org/search/commonwealth:ht250826v
      // a href:
      //   /search/commonwealth:ht250826v
      // Manifest ID:
      //   https://collections.leventhalmap.org/search/commonwealth:ht250826v/manifest
      // Thumbnail:
      //   https://bpldcassets.blob.core.windows.net/derivatives/images/commonwealth:ht2508274/image_thumbnail_300.jpg
      // Image ID:
      //   https://iiif.digitalcommonwealth.org/iiif/2/commonwealth:ht2508274

      const manifestIdMatch = href.match(/\/search\/(?<id>.*)$/)
      const imageIdMatch = thumbnail.src.match(/\/images\/(?<id>.*)\//)

      const manifestId = manifestIdMatch?.groups?.id
      const imageId = imageIdMatch?.groups?.id

      if (manifestId && imageId && thumbnail.title) {
        yield {
          title: thumbnail.title,
          manifestId: `https://collections.leventhalmap.org/search/${manifestId}/manifest`,
          imageId: `https://iiif.digitalcommonwealth.org/iiif/2/${imageId}`
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
