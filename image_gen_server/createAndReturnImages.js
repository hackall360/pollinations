import urldecode from 'urldecode';
import { exec } from 'child_process';
import fetch from 'node-fetch';
import tempfile from 'tempfile';
import fs from 'fs';
import { sendToFeedListeners } from './feedListeners.js';
import { sendToAnalytics } from './sendToAnalytics.js';
import FormData from 'form-data';

const SERVER_URL = 'http://155.248.212.250:5555/predict';
let total_start_time = Date.now();
let accumulated_fetch_duration = 0;
const callWebUI = async (prompts, extraParams = {}, concurrentRequests) => {


  const steps = Math.min(4,Math.round(Math.max(1, (6 - (concurrentRequests/4)))));
  console.log("concurrent requests", concurrentRequests, "steps", steps, "prompts", prompts, "extraParams", extraParams);


  let images = [];
  try {
    const safeParams = extraParams

    if (!safeParams.nofeed)
      prompts.forEach(prompt => {
        sendToFeedListeners({...safeParams, concurrentRequests, prompt, steps });
      });

    const body = {
      "prompts": prompts,
      "steps": steps,
      "height": 384,
      ...safeParams
    };

    console.log("calling prompt", body.prompts);

    // Start timing for fetch
    const fetch_start_time = Date.now();
    // Send the request to the Flask server
    const response = await fetch(SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const fetch_end_time = Date.now();
    
    // Calculate the time spent in fetch
    const fetch_duration = fetch_end_time - fetch_start_time;
    accumulated_fetch_duration += fetch_duration;

    // Calculate the total time the app has been running
    const total_time = Date.now() - total_start_time;

    // Calculate and print the percentage of time spent in fetch
    const fetch_percentage = (accumulated_fetch_duration / total_time) * 100;
    console.log(`Fetch time percentage: ${fetch_percentage}%`);

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const jsonResponse = await response.json();
    console.log("jsonResponse", jsonResponse);
    // quit the process
    images = jsonResponse;
  } catch (e) {
    throw e;
  }


  // load from imagePath to buffer using readFileSync

  const buffers = images.map(({output_path, ...rest}) => {
    console.log("reading image from path", output_path);
    const buffer = fs.readFileSync(output_path);
    // delete imagePath
    setTimeout(() => fs.unlink(output_path, () => null), 10000);
    return { buffer, ...rest };
  })

  // delete imagePath
  
  return buffers;
};
// NSFW API
// # curl command
// # curl -X POST -F "file=@<image_file_path>" http://localhost:10000/check 
// # result: {"nsfw": true/false}
const nsfwCheck = async (buffer) => {
  const form = new FormData();
  form.append('file', buffer, { filename: 'image.jpg' });
  const nsfwCheckStartTime = Date.now();
  const res = await fetch('http://localhost:10000/check', { method: 'POST', body: form });
  const nsfwCheckEndTime = Date.now();
  console.log(`NSFW check duration: ${nsfwCheckEndTime - nsfwCheckStartTime}ms`);
  const json = await res.json();
  return json;
};

const idealSideLength = {
  turbo: 1024, 
  pixart: 768, 
  deliberate: 640,
  dreamshaper: 800,
  formulaxl: 800,
  playground: 960,
  dpo: 768,
  dalle3xl: 768,
  realvis: 768,
};


export const makeParamsSafe = ({ width = null, height = null, seed, model = "turbo", enhance=false, refine=false, nologo=false, negative_prompt="worst quality, blurry", nofeed=false }) => {

  if (refine==="false") 
    refine = false;
  if (refine==="true")
    refine = true;
  if (enhance==="false")
    enhance = false;
  if (enhance==="true")
    enhance = true;
  if (nologo==="false")
    nologo = false;
  if (nologo==="true")
    nologo = true;

  const sideLength = idealSideLength[model] || idealSideLength["turbo"];

  const maxPixels = sideLength * sideLength;

  // if width or height is not an integer set to sideLength

  if (!Number.isInteger(parseInt(width))) {
    width = sideLength;
  }
  
  if (!Number.isInteger(parseInt(height))) {
    height = sideLength;
  }


  // if seed is not an integer set to a random integer
  if (seed && Number.isInteger(parseInt(seed))) {
    seed = parseInt(seed); 
  } else {
    seed = 42;
  }

  // const maxPixels = maxPixelsAll[model] || maxPixelsAll["turbo"];

  // if we exaggerate with the dimensions, cool things down a  little
  // maintaining aspect ratio
  if (width * height > maxPixels) {
    const ratio = Math.sqrt(maxPixels / (width * height));
    width = Math.floor(width * ratio);
    height = Math.floor(height * ratio);
  }
  
  return { width, height, seed, model, enhance, refine, nologo, negative_prompt, nofeed};
};

export async function createAndReturnImageCached(prompts, extraParams, { concurrentRequests = 1}) {
      extraParams = makeParamsSafe(extraParams);
      const buffers = await callWebUI(prompts, extraParams, concurrentRequests);

      // console.log("buffers", buffers);
      const buffersWithLegends = await Promise.all(buffers.map(async ({buffer, has_nsfw_concept: isMature, concept}) => {
        // const { concept, nsfw: isMature } = await nsfwCheck(buffer);

        const isChild = Object.values(concept?.special_scores)?.some(score => score > -0.05);

        console.error("isMature", isMature, "concepts", isChild);
        if (isChild)
          isMature = true;

        const logoPath = isMature ? null : 'logo.png';

        let bufferWithLegend = extraParams["nologo"] || !logoPath ? buffer : await addPollinationsLogoWithImagemagick(buffer, logoPath, extraParams);

        return { buffer:bufferWithLegend, isChild, isMature };
      }));


    return buffersWithLegends;
}

// imagemagick command line command to composite the logo on top of the image
// dynamically resizing the logo to use 30% of the image width
function addPollinationsLogoWithImagemagick(buffer, logoPath, extraParams) {
  // create temporary file for the image
  const tempImageFile = tempfile({ extension: 'png' });
  const tempOutputFile = tempfile({ extension: 'jpg' });

  // write buffer to temporary file
  fs.writeFileSync(tempImageFile, buffer);

  // Calculate the new width of the logo as 30% of the image width
  const targetWidth = extraParams.width * 0.3;
  // Since the original width of the logo is 200px, calculate the scaling factor
  const scaleFactor = targetWidth / 200;
  // Calculate the new height of the logo based on the scaling factor
  // Assuming the logo's original height is also known and proportional scaling is desired
  const targetHeight = scaleFactor * 31; // Replace 200 with the logo's original height if different

  return new Promise((resolve, reject) => {
    exec(`convert -background none -gravity southeast -geometry ${targetWidth}x${targetHeight}+10+10 ${tempImageFile} ${logoPath} -composite ${tempOutputFile}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`error: ${error.message}`);
        reject(error);
        return;
      }
      // get buffer
      const bufferWithLegend = fs.readFileSync(tempOutputFile);

      // delete temporary files
      fs.unlinkSync(tempImageFile);
      fs.unlinkSync(tempOutputFile);

      resolve(bufferWithLegend);
    });
  });
}
function blurImage(buffer, size = 8) {
  // create temporary file for the image
  const tempImageFile = tempfile({ extension: 'png' });
  const tempOutputFile = tempfile({ extension: 'jpg' });

  // write buffer to temporary file
  fs.writeFileSync(tempImageFile, buffer);

  // blur image
  return new Promise((resolve, reject) => {

    exec(`convert ${tempImageFile} -blur 0x${size} ${tempOutputFile}`, (error, stdout, stderr) => {

      if (error) {
        console.error(`error: ${error.message}`);
        reject(error);
        return;
      }
      // get buffer
      const bufferBlurred = fs.readFileSync(tempOutputFile);

      // delete temporary files
      fs.unlinkSync(tempImageFile);
      fs.unlinkSync(tempOutputFile);

      resolve(bufferBlurred);
    });
  });


}
