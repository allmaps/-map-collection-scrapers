import puppeteer from 'puppeteer'

function getUrl(url: string, pageNumber: number) {
  return `${url}&page=${pageNumber}`
}

export default async function* scrape() {
  const collectionUrls = [
    'https://digitalcollections.universiteitleiden.nl/search?type=edismax&cp=collection%3Aubl_maps&islandora_solr_search_navigation=1&f%5B0%5D=mods_accessCondition_restriction_on_access_ms%3A%22Full%5C%20access.%22',
    'https://digitalcollections.universiteitleiden.nl/search?type=edismax&cp=collection%3Akitlv_maps&islandora_solr_search_navigation=1&f%5B0%5D=mods_accessCondition_restriction_on_access_ms%3A%22Full%5C%20access.%22'
  ]

  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  for (const collectionUrl of collectionUrls) {
    let pageNumber = 0

    while (true) {
      let url = getUrl(collectionUrl, pageNumber)

      console.log(`Fetching ${url}`)

      await page.goto(url, { timeout: 30000 * 10 })

      await page.waitForSelector('#page')

      const results = await page.$$('.islandora-solr-search-result')

      for (const result of results) {
        const href = await result.$eval('a', (a) => a.getAttribute('href'))
        const title = await result.$eval('a img', (img) =>
          img.getAttribute('alt')
        )

        // Example URL:
        //   https://digitalcollections.universiteitleiden.nl/view/item/4082265
        // a href:
        //   /view/item/4094706?solr_nav%5Bid%5D=19c9a1371998e4767cc0&solr_nav%5Bpage%5D=0&solr_nav%5Boffset%5D=0
        // Manifest ID:
        //   https://digitalcollections.universiteitleiden.nl/iiif_manifest/item:4082265/manifest
        // Thumbnail:
        //   https://digitalcollections.universiteitleiden.nl/sites/default/files/styles/islandora_imagecache_image_style_medium/public/externals/7d34b001fb9b4a2301e7d75ad735725e.jpg?itok=IOpFLdzM&solr_nav%5Bid%5D=7781687ed00e78cba534&solr_nav%5Bpage%5D=0&solr_nav%5Boffset%5D=1
        // Image ID:
        //   https://iiif.universiteitleiden.nl/iiif/2/hdl:1887.1%2Fitem:4082265

        const idMatch = href.match(/\/view\/item\/(?<id>.*)\?/)
        const id = idMatch?.groups?.id

        if (id && title) {
          const manifestId = `https://digitalcollections.universiteitleiden.nl/iiif_manifest/item:${id}/manifest`
          const imageId = `https://iiif.universiteitleiden.nl/iiif/2/hdl:1887.1%2Fitem:${id}`

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
  }

  await browser.close()
}
