import mineflayer from 'mineflayer'
import mcData from 'minecraft-data'
import { Item } from 'prismarine-item'

// plugin options
interface Options{
    putItems: string[] // 需要放置物品的列表
    minimum_stack: number // 最少放置多少组物品
}

declare module 'mineflayer' {
    interface Bot {
        registry: mcData.IndexedData
        ci: {
            disabled: boolean
            isPutting: boolean
            options: Options
            disable: () => void
            enable: () => void
            put: () => void
            dontputcloudinventory: boolean
        }
    }

    interface BotEvents {
        ci_startputting: (putItems: Item[]) => void
        ci_finishedputting: (putItems: Item[]) => void
    }
}

// 防止物品存入云仓的速度太快，导致反作弊踢出
export function plugin(bot: mineflayer.Bot){
    bot.ci.disabled = true
    bot.ci.isPutting = false

    bot.ci.options = {
        putItems: [],
        minimum_stack: 0
    }

    bot.ci.enable = () => {
        bot.ci.disabled = false
    }

    bot.ci.disable = () => {
        bot.ci.disabled = true
    }

    bot.ci.put = () => {
        if (bot.ci.isPutting) return
        bot.chat("/ci put")
    }
    bot.on("physicTick",() => {
        // 检查是否已经超越速度限制
        if (bot.ci.dontputcloudinventory) return
        // 检查是否已经进行了存入，如果是则返回
        if (bot.ci.isPutting) return
        // 提取所有需要存入云仓的物品
        let put_items = bot.inventory.items().filter(item => bot.ci.options.putItems.includes(item.name))
        // 检查需要存入云仓的物品组是否超过或等于最少放置多少组物品的数量
        if (put_items.length >= bot.ci.options.minimum_stack){
            bot.ci.isPutting = true
            bot.ci.dontputcloudinventory=true
            bot.chat("/ci put")
            bot.emit("ci_startputting", put_items)
        }
    })

    bot.on("windowOpen", (window) => {
        bot.ci.isPutting = true
        // 检查窗口标题是否云仓专属的，如果不是则返回
        if (window.title !== "{\"text\":\"上传物品\"}") return

        // 提取所有需要存入云仓的物品
        let put_items = bot.inventory.items().filter(item => bot.ci.options.putItems.includes(item.name))
        // 检查需要存入云仓的物品组是否超过或等于最少放置多少组物品的数量，如果不是则返回
        if (put_items.length !>= bot.ci.options.minimum_stack) return
        let count: number = 0
        put_items.forEach(item => {count+=item.count})
        bot.transfer({
            window: window,
            itemType: put_items[0].type,
            metadata: put_items[0].metadata,
            sourceStart: 54,
            sourceEnd: 89,
            destStart: 0,
            destEnd: 53,
            count: count
        })
        // 关闭窗口
        try{
            // @ts-ignore
            window.close()
        } catch (err){
            // console.log(err)
            // 这个应该不会报错
        }
        bot.ci.isPutting = false
        bot.emit("ci_finishedputting", put_items)
        // 解除速度限制
        setTimeout(() => {
            bot.ci.dontputcloudinventory=false
        }, 2500)
    })
}