import fetch from "node-fetch";
import * as fs from "fs";
import * as Discord from "discord.js";
const Client = new Discord.Client({"intents": ["GUILDS", "GUILD_MESSAGES", "DIRECT_MESSAGES"], "partials": ["CHANNEL"]});
import JSEncrypt from "jsencrypt";

const cityCodes = {"서울특별시": "sen", "부산광역시": "pen", "대구광역시": "dge", "인천광역시": "ice", "광주광역시": "gen", "대전광역시": "dje", "울산광역시": "use", "세종특별자치시": "sje", "경기도": "goe", "강원도": "kwe", "충청북도": "cbe", "충청남도": "cne", "전라북도": "jbe", "전라남도": "jne", "경상북도": "gbe", "경상남도": "gne", "제주특별자치도": "jje"}

Client.once("ready", function() {
    console.log("Discord Bot Ready!");
});

Client.on("messageCreate", async function(message) {
    if (message.author.bot) return;
    else if (message.content === "$registercmds" && message.author.id === "908486787918348338") {
        for (const command of await message.guild.commands.fetch()) await message.guild.commands.delete(command[0]);
        const cityArray = [];
        for (const city of Object.keys(cityCodes)) cityArray.push({"name": city, "value": cityCodes[city].toUpperCase()});
        await message.guild.commands.create({"name": "track", "description": "학교 정보 트래킹", "type": "CHAT_INPUT", "options": [{"type": "STRING", "name": "이름", "description": "예) 홍길동", "required": true}, {"type": "STRING", "name": "생년월일", "description": "예) 051231", "required": true}, {"type": "STRING", "name": "도시", "description": "예) 서울특별시", "required": false, "choices": cityArray}]});
        await message.reply({"embeds": [new Discord.MessageEmbed().setTitle("✅ 슬래시 명령어 등록 완료!").setColor("GREEN")]});
    }
});

Client.on("interactionCreate", async function(interaction) {
    if (!interaction.isCommand()) return;
    else if (interaction.commandName === "track") {
        const name = interaction.options.getString("이름");
        const birthDate = interaction.options.getString("생년월일");
        const cityName = interaction.options.getString("도시");
        var schoolLevel = birthDate.substring(0, 2);
        if (birthDate.length === 6 && !isNaN(birthDate) && 4 <= schoolLevel && schoolLevel <= 15 && birthDate.substring(2, 4) <= 12 && birthDate.substring(4, 6) <= 31) {
            await interaction.reply({"embeds": [new Discord.MessageEmbed().setTitle("🛠️ 트래킹 준비 중...").setColor("BLUE")]});
            if (10 <= schoolLevel) schoolLevel = "초등학교";
            else if (schoolLevel <= 6) schoolLevel = "고등학교";
            else schoolLevel = "중학교";

            var schoolData = JSON.parse(fs.readFileSync("./schoolData.json").toString("utf8"));
            if (cityName) Object.keys(schoolData).filter(code => cityCodes[schoolData[code].city] !== cityName.toLowerCase() && delete schoolData[code]);
            const schoolTasks = Object.keys(schoolData).filter(code => schoolData[code].name.includes(schoolLevel)).reduce(function(resultArray, item, i) {
                const chunkIndex = Math.floor(i / 300);
                if (!resultArray[chunkIndex]) resultArray[chunkIndex] = [];
                resultArray[chunkIndex].push(item);
                return resultArray;
            }, []);

            await interaction.editReply({"embeds": [new Discord.MessageEmbed().setTitle(`🛠️ 0/${schoolTasks.length} 페이지 트래킹 중...`).setColor("BLUE")]});
            var taskSuccess = 0;
            var taskIndex = 0;
            for (const schoolTask of schoolTasks) {
                taskIndex++;
                await interaction.editReply({"embeds": [new Discord.MessageEmbed().setTitle(`🛠️ ${taskIndex}/${schoolTasks.length} 페이지 트래킹 중...`).setColor("BLUE")]});
                await Promise.all(schoolTask.map(async function(task) {
                    const userData = await fetch(`https://${cityCodes[schoolData[task].city]}hcs.eduro.go.kr/v2/findUser`, {
                        "headers": {
                            "accept": "application/json, text/plain, */*",
                            "accept-language": "en-US,en;q=0.9",
                            "content-type": "application/json;charset=UTF-8",
                            "sec-fetch-dest": "empty",
                            "sec-fetch-mode": "cors",
                            "sec-fetch-site": "same-site",
                            "x-requested-with": "XMLHttpRequest",
                            "Referer": "https://hcs.eduro.go.kr/",
                            "Referrer-Policy": "strict-origin-when-cross-origin"
                        },
                        "body": JSON.stringify({"orgCode": task, "name": encryptData(name), "birthday": encryptData(birthDate), "stdntPNo": null, "loginType": "school"}),
                        "method": "POST"
                    }).catch(() => ({"status": 500}));

                    if (userData.status === 200) {
                        await interaction.channel.send({"content": interaction.user.toString(), "embeds": [new Discord.MessageEmbed().setTitle("✅ 트래킹 성공").setColor("GREEN").setDescription(`**${schoolData[task].city} ${schoolData[task].name}** 에서 **${name}** 님의 정보를 찾았습니다!`)]});
                        taskSuccess++;
                    }
                }));
            }
            if (taskSuccess) await interaction.editReply({"embeds": [new Discord.MessageEmbed().setTitle("✅ 트래킹 완료").setColor("GREEN").setDescription(`**${name}** 님의 정보를 ${taskSuccess}개 찾았습니다!`)]});
            else await interaction.editReply({"embeds": [new Discord.MessageEmbed().setTitle("❌ 트래킹 실패").setColor("RED").setDescription(`**${name}** 님의 정보를 찾지 못했습니다!`)]});
            await interaction.channel.send(interaction.user.toString()).then(m => m.delete());
        }
        else await interaction.reply({"embeds": [new Discord.MessageEmbed().setTitle("❌ 생년월일을 다시 확인해 주세요!").setColor("RED")]});
    }
});

Client.login("OTUxNzI1NTYzNDk4ODgxMDQ0.YirpgA.uUxEfch8ibIj5wDY_MVmbqEJ86I");

function encryptData(data) {
    const jsEncrypt = new JSEncrypt();
    jsEncrypt.setPublicKey("30820122300d06092a864886f70d01010105000382010f003082010a0282010100f357429c22add0d547ee3e4e876f921a0114d1aaa2e6eeac6177a6a2e2565ce9593b78ea0ec1d8335a9f12356f08e99ea0c3455d849774d85f954ee68d63fc8d6526918210f28dc51aa333b0c4cdc6bf9b029d1c50b5aef5e626c9c8c9c16231c41eef530be91143627205bbbf99c2c261791d2df71e69fbc83cdc7e37c1b3df4ae71244a691c6d2a73eab7617c713e9c193484459f45adc6dd0cba1d54f1abef5b2c34dee43fc0c067ce1c140bc4f81b935c94b116cce404c5b438a0395906ff0133f5b1c6e3b2bb423c6c350376eb4939f44461164195acc51ef44a34d4100f6a837e3473e3ce2e16cedbe67ca48da301f64fc4240b878c9cc6b3d30c316b50203010001");
    return jsEncrypt.encrypt(data);
}