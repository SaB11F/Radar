import cron from 'cron';
import https from 'https';

const job = new cron.CronJob('*/14 * * * *', function () {
    https
        .get(process.env.API_URL, (res) => {
            if(res.statusCode === 200) console.log("GET request sent successfully");
            else console.log("GET request failed", res.statusCode);
        })
        .on('error', (e) => {
            console.error("Error while sending request",e);
        });
});

export default job;

//CRON JOB EXPLANATION
//Cron jobs are used to schedule tasks that run periodically at fixed intervals
//we want to send 1 GET request for every 14 minutes

//How to define a "Schedule"
//You define a schedule using a cron expression, which consists of a five fields representing

//minute, hour, day of month, month, and day of week

//examples:

//* 14 * * * => every 14 minutes
//* * * * * => every minute
//0 * * * * => every hour at minute 0
//0 0 * * * => every day at midnight
//0 0 * * 0 => every week at midnight on Sunday
