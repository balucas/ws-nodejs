const redis = require('redis')
const client = redis.createClient(process.env.REDIS_URL)
const reqLimit = 5

module.exports = (req, res, next) =>{
    client.exists(req.ip, (err, exists) => {

        //redis error
        if(err){
            console.log("Error: ", err)
            res.status(500)
            res.send()
        }

        if(!exists){
            //store new connection ip into redis
            let body = {
                "reqCount": 1,
                "windowStart": Date.now()
            }
            client.set(req.ip, JSON.stringify(body))
            next()
        }else{
            client.get(req.ip, (err, reply) => {
                let body = JSON.parse(reply)
                let start = body.windowStart
                
                //get minutes since window start
                let diff = (Date.now() - start) / 60000

                if(diff > 1){
                    //reset request window
                    body.reqCount = 1
                    body.windowStart = Date.now()
                    client.set(req.ip, JSON.stringify(body))
                    next()
                }else{
                    if(body.reqCount < reqLimit){
                        //increment request count
                        body.reqCount++
                        client.set(req.ip, JSON.stringify(body))
                        next()
                    }else{
                        //exceeded rate limit
                        res.status(429)
                        res.send()
                    }
                }
            })
        }
    })
}