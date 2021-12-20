import "dotenv/config";
import axios from "axios";
import fs from "fs";
import path from "path";

const __dirname = path.resolve();

// YOUR URL
const FigmaURL = 'https://www.figma.com/file/jGfCodIb0zer22xqwpdBaq/Typed-Design-System-(V0.2)?node-id=5900%3A23952';

const decodeURL = (url) => decodeURIComponent(url);

const parseUrl = (url) => {
  const decodedURL = new URL(decodeURL(url));
  const key = decodedURL.pathname.split('/')[2];
  const title = decodedURL.pathname.split('/')[3];
  const nodeId = decodedURL.searchParams.get('node-id');
  return {
    key, title, nodeId
  }
}

const makeFigmaFileNodeUrl = (key, nodeId) => `https://api.figma.com/v1/files/${key}/nodes?ids=${nodeId}`;
const getFigmaImageUrl = (key, nodeId) => `https://api.figma.com/v1/images/${key}?ids=${nodeId}&format=svg`;

const getSVGNodeListFromNode = async () => {
  try {
    const {key, nodeId} = parseUrl(FigmaURL);

    const {status, data} = await axios.get(makeFigmaFileNodeUrl(key, nodeId), {
      headers: {
        'X-Figma-Token': process.env.FIGMA_ACCESS_TOKEN
      }
    })
    
    if (status >= 300) {
      throw new Error(`Figma API returned ${response.status} status code`)
    }
  
    const svgList = data.nodes[nodeId].document.children
    
    if (!Array.isArray(svgList)) {
      throw new Error(`children is not an array`)
    }

    if(!svgList) {
      throw new Error(`children not found`)
    }

    return svgList
  } catch (error) {
    console.error(error);
  }
}

const fetchFigmaImage = async (key, {id, name}) => {
  try {
    const {status, data} = await axios.get(getFigmaImageUrl(key, id), {
      headers: {
        'X-Figma-Token': process.env.FIGMA_ACCESS_TOKEN
      }
    })

    if (!data) {
      throw new Error(`data not found, node id is ${id}, icon name is ${name}`)
    }

    if (status >= 300) {
      throw new Error(`Figma API returned ${response.status} status code`)
    }

    return {...data, id, name};
  } catch (error) {
    console.error(error);
  }
}


const getSVGFromNode = async (svgList) => {
  try {
    const {key} = parseUrl(FigmaURL);

    const svgURLs = await Promise.all(
      svgList.map((svgNode) => {
        const data = fetchFigmaImage(key, svgNode)
        if (!data) {
          console.error(`data not found, node id is ${svgNode.id}, icon name is ${svgNode.name}`)
        }
        return data
      })
    )

    if (svgURLs.filter(el => el !== undefined).length !== svgList.length) {
      console.log("there are undefined elements")
    }

    return svgURLs.filter(svgUrl => svgUrl.err === null)
  } catch (error) {
    console.error(error)
  }
}

const extractSVGFromUrl = async (svgURLs) => {
  try {
    svgURLs.forEach(async (svgUrl) => {
      let {name, images, id} = svgUrl;
      const svgDOM = await axios.get(images[id]);

      name = name.replaceAll("/", "-")

      fs.writeFile(`${__dirname}/icons/${name}.svg`, svgDOM.data, (error) => {
        if (error) throw error;
        console.log(`The file ${name}.svg has been saved!`);
      })
    })
  } catch (error) {
    console.error(error)
  }
}

getSVGNodeListFromNode().then(getSVGFromNode).then(extractSVGFromUrl)