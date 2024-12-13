import { XMLParser } from 'fast-xml-parser'

const count = 150

type Record = {
  'srw:recordData': {
    'oai_dc:dc': {
      'dc:title': string
    }
  }
  'srw:extraRecordData': {
    link: string
  }
}

type Results = {
  'srw:searchRetrieveResponse': {
    'srw:records': {
      'srw:record': Record[]
    }
  }
}

function getUrl(page: number, count: number) {
  const maximumRecords = count
  const startRecord = page * count + 1
  return `https://gallica.bnf.fr/SRU?operation=searchRetrieve&version=1.2&maximumRecords=${maximumRecords}&startRecord=${startRecord}&query=dc.type%20adj%20%22carte%22`
}

export default async function* scrape() {
  const parser = new XMLParser()

  let pageNumber = 0

  while (true) {
    let url = getUrl(pageNumber, count)

    console.log(`Fetching ${url}`)

    try {
      const xmlResults = await fetch(url).then((response) => response.text())
      const results = parser.parse(xmlResults) as Results

      const records =
        results['srw:searchRetrieveResponse']['srw:records']['srw:record']

      for (const record of records) {
        const link = record['srw:extraRecordData'].link

        // Example link:
        //   https://gallica.bnf.fr/ark:/12148/btv1b101007676
        // Example IIIF Manifest ID:
        //   https://openapi.bnf.fr/iiif/presentation/v3/ark:/12148/btv1b10100817h/manifest.json
        // Example IIIF Image ID:
        //   https://openapi.bnf.fr/iiif/image/v3/ark:/12148/btv1b10100817h/f1/info.json

        const match = link.match(/ark:\/(?<id>.+)/)
        const id = match?.groups?.id

        if (!id) {
          continue
        }

        const title = record['srw:recordData']['oai_dc:dc']['dc:title']
        const manifestId = `https://openapi.bnf.fr/iiif/presentation/v3/ark:/${id}/manifest.json`
        const imageId = `https://openapi.bnf.fr/iiif/image/v3/ark:/${id}/f1`

        if (title && manifestId && imageId) {
          yield {
            title,
            manifestId,
            imageId
          }
        }
      }

      if (records.length) {
        pageNumber++
      } else {
        break
      }
    } catch (err) {
      console.log('Error fetching', url)
      pageNumber++
    }
  }
}
