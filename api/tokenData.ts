import Vibrant from "node-vibrant";
import { Palette } from "node-vibrant/lib/color";
import fetch from "node-fetch";
import Web3 from "web3";
import ERC20ABI from "../src/rari-sdk/abi/ERC20.json";

import { NowRequest, NowResponse } from "@vercel/node";

const web3 = new Web3(
  `https://mainnet.infura.io/v3/${process.env.REACT_APP_INFURA_ID}`
);

export default async (request: NowRequest, response: NowResponse) => {
  const address = request.query.address as string;

  const tokenContract = new web3.eth.Contract(ERC20ABI as any, address);

  const [decimals, rawData] = await Promise.all([
    tokenContract.methods
      .decimals()
      .call()
      .then((res) => parseFloat(res)),

    fetch(
      "https://api.coingecko.com/api/v3/coins/ethereum/contract/" + address
    ).then((res) => res.json()),
  ]);

  if (rawData.error) {
    const name = await tokenContract.methods.name().call();
    const symbol = await tokenContract.methods.symbol().call();

    response.setHeader("Cache-Control", "s-maxage=259200");
    response.json({
      name,
      symbol,
      decimals,
      color: "#FFFFFF",
      overlayTextColor: "#000",
      logoURL:
        "https://raw.githubusercontent.com/feathericons/feather/master/icons/help-circle.svg",
    });

    return;
  }

  const {
    symbol,
    name,
    image: { small },
  } = rawData;

  const basicTokenInfo = {
    symbol: symbol.toUpperCase(),
    name,
    decimals,
  };

  let color: Palette;
  try {
    color = await Vibrant.from(small).getPalette();
  } catch (error) {
    response.setHeader("Cache-Control", "max-age=2592, s-maxage=25920");
    response.json({
      ...basicTokenInfo,
      color: "#FFFFFF",
      overlayTextColor: "#000",
      logoURL:
        "https://raw.githubusercontent.com/feathericons/feather/master/icons/help-circle.svg",
    });

    return;
  }

  if (!color.Vibrant) {
    response.setHeader("Cache-Control", "max-age=2592, s-maxage=25920");
    response.json({
      ...basicTokenInfo,
      color: "#FFFFFF",
      overlayTextColor: "#000",
      logoURL:
        "https://raw.githubusercontent.com/feathericons/feather/master/icons/help-circle.svg",
    });

    return;
  }

  response.setHeader("Cache-Control", "max-age=25920, s-maxage=259200");
  response.json({
    ...basicTokenInfo,
    color: color.Vibrant.getHex(),
    overlayTextColor: color.Vibrant.getTitleTextColor(),
    logoURL: small,
  });
};
