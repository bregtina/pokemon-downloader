import inquirer from 'inquirer';
import fs from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';

const APP = {
  pokemonName: null,
  URL: null,
  __filename: null,
  __dirname: null,
  folderDir: null,

  questionPickPokemon: {
    type: 'input',
    name: 'selectedPokemon',
    message: 'Pokemon name',
  },
  questionPickData: {
    type: 'checkbox',
    name: 'selectedData',
    message: 'Pokemon info to download',
    choices: [
      {
        name: 'Stats',
      },
      {
        name: 'Sprites',
      },
      {
        name: 'Artwork',
      },
    ],
    validate: (answer) => {
      if (answer.length < 1) {
        return 'You must pick at least one type of data to download';
      }
      return true;
    },
  },
  questionSearchAgain: {
    type: 'confirm',
    name: 'searchNextPokemon',
    message: 'Would you like to search for another pokemon?',
    default: false,
  },

  inquirerPickPokemon: () => {
    inquirer
      .prompt(APP.questionPickPokemon)
      .then((answer) => {
        if (answer.selectedPokemon === '') {
          throw new Error('You need to fill in pokemon name');
        }
        APP.init(answer.selectedPokemon);
      })
      .catch((error) => {
        console.log(error.message);
        APP.inquirerPickPokemon();
      });
  },
  inquirerPickData: async (allData) => {
    inquirer
      .prompt(APP.questionPickData)
      .then((answer) => {
        APP.writeDirectory(APP.folderDir);
        return answer.selectedData;
      })
      .then(async (selectedData) => {
        selectedData.forEach(async (item) => {
          if (item === 'Stats') {
            await APP.downloadStats(allData.stats);
          }
          if (item === 'Sprites') {
            await APP.downloadSprites(allData.sprites);
          }
          if (item === 'Artwork') {
            const official = 'official-artwork';
            const artwork = allData.sprites.other[official].front_default;
            await APP.downloadArtwork(artwork);
          }
        });
      })
      .then(() => {
        setTimeout(async () => {
          await APP.inquirerSearchAgain();
        }, 1500);
      })

      .catch((error) => {
        console.log(error.message);
      });
  },

  inquirerSearchAgain: async () => {
    inquirer.prompt(APP.questionSearchAgain).then((answer) => {
      if (answer.searchNextPokemon === true) {
        APP.inquirerPickPokemon();
      } else {
        console.log('Finished searching');
      }
    });
  },
  init: async (chosenPokemon) => {
    APP.pokemonName = chosenPokemon.toLowerCase().replaceAll(' ', '-');
    APP.URL = `https://pokeapi.co/api/v2/pokemon/${APP.pokemonName}`;
    APP.__filename = url.fileURLToPath(import.meta.url);
    APP.__dirname = path.dirname(APP.__filename);
    APP.folderDir = path.resolve(
      path.join(APP.__dirname, `${APP.pokemonName}`)
    );

    await APP.fetchPokemonData();
  },
  fetchPokemonData: async () => {
    try {
      const response = await fetch(APP.URL);
      if (!response.ok) {
        throw new Error('Pokemon does not exist');
      }

      const allData = await response.json();
      await APP.inquirerPickData(allData);
    } catch (error) {
      console.log(error.message);
      await APP.inquirerPickPokemon();
    }
  },
  downloadStats: async (stats) => {
    let statsData = '';
    for (let stat of stats) {
      let statistic = stat.stat.name;
      let baseNr = stat.base_stat;
      statsData += `${statistic}: ${baseNr}\n`;
    }
    await APP.writeFile(`${APP.folderDir}/stats.txt`, statsData);
  },
  downloadSprites: async (sprites) => {
    let spritesObj = {};
    for (let [key, value] of Object.entries(sprites)) {
      if (typeof value === 'string' && value.startsWith('https')) {
        spritesObj[key + '.png'] = value;
      }
    }
    for (let [key, value] of Object.entries(spritesObj)) {
      await APP.downloadImage(value, `${APP.folderDir}/${key}`);
    }
  },
  downloadArtwork: async (artwork) => {
    await APP.downloadImage(artwork, `${APP.folderDir}/official-artwork.png`);
  },
  downloadImage: async (url, filePath) => {
    const response = await fetch(url);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await APP.writeFile(filePath, buffer);
  },
  writeDirectory: async (folderDir) => {
    try {
      await fs.mkdir(folderDir);
      const fileName = path.basename(folderDir);
      console.log(`Created new folder **${fileName}**`);
    } catch (error) {
      console.log(`Folder ${path.basename(folderDir)} already exists`);
    }
  },
  writeFile: async (filePath, data) => {
    try {
      await fs.writeFile(filePath, data);
      const fileName = `${APP.pokemonName}/${path.basename(filePath)}`;
      console.log(`Saved: ${fileName}`);
    } catch (error) {
      console.log(
        `Got an error trying to write to ${path.basename(filePath)}, Error: ${
          error.message
        }`
      );
    }
  },
};

console.log('======= POKEMON DOWNLOADER =======');
APP.inquirerPickPokemon();
