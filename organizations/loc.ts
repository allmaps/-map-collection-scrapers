const count = 150

type Result = {
  url: string
  image_url: string[]
  item: {
    title: string
  }
}

type Results = {
  pages: {
    children: { results: Result[] }[]
  }[]
  pagination: {
    next: string
  }
}

function getTitle(result: any) {
  try {
    return result.item.title
  } catch (err) {
    return undefined
  }
}

function getManifestId(result: Result) {
  try {
    return `${result.url}manifest.json`
  } catch (err) {
    return undefined
  }
}

function getImageId(result: Result) {
  try {
    return result.image_url
      .filter((url: string) => url.includes('iiif'))[0]
      .split('/full/')[0]
  } catch (err) {
    return undefined
  }
}

export default async function* scrape() {
  let url = `https://loc.gov/maps?st=list&c=${count}&fo=json`

  while (url) {
    console.log(`Fetching ${url}`)
    const data = (await fetch(url).then((response) =>
      response.json()
    )) as Results

    const results = data.pages[0].children[0].results

    for (const result of results) {
      const title = getTitle(result)

      const manifestId = getManifestId(result)
      const imageId = getImageId(result)

      if (title && manifestId && imageId) {
        yield {
          title,
          manifestId,
          imageId
        }
      }
    }

    url = data.pagination.next
  }
}
