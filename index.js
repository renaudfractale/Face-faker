// Pour se connecter au site web https://thispersondoesnotexist.com/
const request = require('request')
// Librairie classique
const fs = require('fs')
// Générateur de meta-données
const faker = require('faker/locale/fr');

//https://davideandreazzini.co.uk/use-face-api-js-on-node/
const faceapi = require("face-api.js")  
const canvas = require("canvas");  


const NB_AVATARS = 150
// mokey pathing the faceapi canvas
const { Canvas, Image, ImageData } = canvas  
faceapi.env.monkeyPatch({ Canvas, Image, ImageData })

// SsdMobilenetv1Options
const minConfidence = 0.5
const faceDetectionNet = faceapi.nets.ssdMobilenetv1
const faceDetectionOptions = new faceapi.SsdMobilenetv1Options({ minConfidence })

// Classe ThisPersonDoesNotExist
class ThisPersonDoesNotExist {

    constructor(options) {
    }

    /**
     * Get the image in base64
     *
     * @param {string} body buffer
     * @param {string} mimType type
     * @param {number} width default 128
     * @param {number} height default 128
     * @returns {string} resizedBase64
     * @memberof ThisPersonDoesNotExist
     */
    async getBase64(body, mimType, width, height) {
        let resizedImageBuffer = await sharp(body)
            .resize(width, height)
            .toBuffer();
        let resizedImageData = resizedImageBuffer.toString('base64');
        let resizedBase64 = `data:${mimType};base64,${resizedImageData}`;
        return resizedBase64;
    }

    /**
     * Create the image locally and return an object with the details
     *
     * @param {string} body buffer
     * @param {string} path path
     * @param {number} width default 128
     * @param {number} height default 128
     * @returns {object} 
     * @memberof ThisPersonDoesNotExist
     */
    async getImagePath(body, path, width, height) {
        let name = `${this.getId(10)}.jpeg`;
        let ImagePath = await sharp(body)
            .resize(width, height)
            .toFile(`${path}/${name}`);
        return Object.assign(ImagePath, {
            name
        })
    }

    /**
     * Get the image remotely
     *
     * @returns {Object}
     * @memberof ThisPersonDoesNotExist
     */
    async getRemoteImage() {
        return new Promise((resolve, reject) => {
            request.get({
                url: 'https://thispersondoesnotexist.com/image',
                encoding: null
            }, (error, response, body) => {
                if (error) return reject(error);
                try {
                    if (response.statusCode == 200) {
                        let img = new Buffer.from(body, 'base64');
                        let mimType = response.headers["content-type"];
                        resolve({
                            img,
                            mimType
                        });
                    } else {
                        throw error;
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });
    }

    /**
     * Obtain a image
     *
     * @param {Object} options {
     *         width,
     *         height,
     *         type,
     *         path
     *     }
     * @returns {Object}
     * @memberof ThisPersonDoesNotExist
     */
    async getImage({
        width,
        height,
        type,
        path
    }) {

        width = width || 128;
        height = height || 128;
        type = type || 'file';
        path = path || '.';

        try {

            let {
                img,
                mimType
            } = await this.getRemoteImage();

            if (img && mimType) {

                let response;

                switch (type) {
                    case 'base64':
                        response = await this.getBase64(img, mimType, width, height);
                        break;

                    case 'file':
                        response = await this.getImagePath(img, path, width, height);
                        break;

                    default:
                        break;
                }

                return {
                    status: true,
                    data: response
                };
            } else {
                throw error;
            }
        } catch (error) {
            throw error;
        }
    }

    /**
     * Cron Job
     *
     * @param {Object} options {
     *         time,
     *         width,
     *         height,
     *         type,
     *         path
     *     }
     * @returns {Event} created
     * @memberof ThisPersonDoesNotExist
     */
    cron({
        time,
        width,
        height,
        type,
        path
    }) {
        schedule.scheduleJob(time, async () => {
            let res = await this.getImage({
                width,
                height,
                type,
                path
            });
            this.emit('created', res);
        });
    }

    /**
     * Generate random name
     *
     * @param {*} length
     * @returns {string} text
     * @memberof ThisPersonDoesNotExist
     */
    getId(length) {
        let text = "";
        const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < length; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        return text;
    }

}


async function MakeAvatar() {
    if(!fs.existsSync("out")) {
        fs.mkdirSync("out")
    }

    // load weights
    await faceDetectionNet.loadFromDisk('weights')
    //await faceapi.nets.faceLandmark68Net.loadFromDisk('weights')
    await faceapi.nets.ageGenderNet.loadFromDisk('weights')

    // Initialisation de data
    let data = {
        age :   0,
        genre :  "",
        ageRound : 0
    }
    for (let index = 1; index <= NB_AVATARS; index++) {
        console.log("Avatar No "+index)
        // si ficher déjà créer on ne fait rien
        if (fs.existsSync("out/"+index+".jpeg") && fs.existsSync("out/"+index+".json")) {
            console.log(index+"=> continue")
            continue
        }

        if (fs.existsSync("out/"+index+".jpeg")) {
            fs.unlinkSync("out/"+index+".jpeg")
        }
        
        if ( fs.existsSync("out/"+index+".json")) {
            fs.unlinkSync("out/"+index+".json")
        }

        let oldData = data
        do {
            // Création de l'avatar
            let avatar = new ThisPersonDoesNotExist()
            img_avatar =  await avatar.getRemoteImage()
            fs.writeFileSync("out/"+index+".jpeg", img_avatar.img) 
            
            // Analyse de l'avatar
            let  img = await canvas.loadImage("out/"+index+".jpeg")
            const results = await faceapi.detectAllFaces(img, faceDetectionOptions).withAgeAndGender()

            data = {
                age :   results[0].age,
                genre :  results[0].gender,
                ageRound : Math.round(results[0].age)
            }
        } while(oldData.ageRound==data.ageRound &&  oldData.genre==data.genre);
        console.log("Avatar No "+index,data)
        let metadata = {
            data,
            adresse_vie : {
                adresse : faker.address.streetAddress(true),
                ville : faker.address.cityName(),
                codeZip : faker.address.zipCode("#####")
            },
            adresse_naissance : {
                ville : faker.address.cityName(),
                codeZip : faker.address.zipCode("#####")
            },
            date_naissance : new Date(new Date().getTime()- Math.round(31540000000*data.age)),
            date_inscription : new Date(),
            tel_contact : faker.phone.phoneNumber(),
            email_contact : faker.internet.email(),
            pseudo : faker.internet.userName() ,
            password : faker.internet.password() ,
            firstName : faker.name.firstName(data.genre == 'male' ? 0 : 1) ,
            lastName : faker.name.lastName() 
        }
        fs.writeFileSync('out/'+index+".json" ,JSON.stringify(metadata,undefined,5) )
    }
}


MakeAvatar()