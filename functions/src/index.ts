import * as functions from 'firebase-functions';
import { NotificationFunctions } from './notifications';

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
import * as admin from "firebase-admin";
const notificationFunctions = new NotificationFunctions();
admin.initializeApp();
export const hourly_job = functions.pubsub
  .topic('hourly-tick')
  .onPublish((message) => {
    console.log("This job is run every hour!");
    if (message.data) {
      const dataString = Buffer.from(message.data, 'base64').toString();
      console.log(`Message Data: ${dataString}`);
    }
    return admin.database().ref('users').once('value').then(res => {
        const usersRef = res.val();
        console.log(usersRef);
	console.log(res);
        const uidArray = Object.keys(usersRef);
        const sortedAmbassadors = uidArray
        .map(uid => { return {id: uid,...usersRef[uid]}})
        .filter(user => {return !!(user && user.ambassador)})
        .sort((a,b) => { return (b.ambassador.points - a.ambassador.points) });
        console.log('sortedAmbassadors',sortedAmbassadors);
        const updateAllRankPromises = sortedAmbassadors.map((user, i) => {
            user.ambassador.rank = i+1;
            return admin.database().ref('users/' + user.id + '/ambassador').set(user.ambassador);
        });
        return Promise.all(updateAllRankPromises).then(() => {
            const leaders = sortedAmbassadors.slice(0,5).map(user => {
                return {
                    collegeId: user.collegeId, 
                    name: user.name, 
                    points: user.ambassador.points, 
                    rank: user.ambassador.rank,
                    collegeName: ''
                };
            });
            const collegeNamesPromises = sortedAmbassadors.map(ambassador => {
                return admin.database().ref('colleges/' + ambassador.collegeId).once('value');
            })
           return Promise.all(collegeNamesPromises).then(collegeNames => {
               leaders.forEach((leader,i) => {
                delete leader.collegeId;
                leader.collegeName = (collegeNames[i].val() && collegeNames[i].val().name) || 'other';
               });
               console.log(leaders);
            return admin.database().ref('leaderboard/ambassadors').set(leaders);
           });
        });
    });
  });

export const daily_job = functions.pubsub.topic('daily-tick').onPublish((message) => {
    console.log("This job is run every day!");
    if (message.data) {
      const dataString = Buffer.from(message.data, 'base64').toString();
      console.log(`Message Data: ${dataString}`);
    }
    return admin.database().ref('/events').once('value')
    .then(success)
    .then(events => {
        const eventKeys = Object.keys(events);
        const eventId = eventKeys[(Math.random() * (eventKeys.length - 1)).toFixed(0)];
        console.log(eventId);
        
        const notificationData = {
            message: {
                token: null,
                notification: {
                     title: "TCF'19 Event of the Day",
                    body: "The event of the day is " + events[eventId]['name'] + '. Click here to learn more about the event!!'
                    },
                    webpush: {
                    headers: {
                        Urgency: 'high'
                        },
                    fcm_options: {
                        link: 'https://tcf.nitp.tech/events/' + eventId
                    },
                    notification: {
                        body: "TCF Event of the Day is " + events[eventId]['name'] + '. Click here to learn more about the event!!',
                        requireInteraction: "true",
                        badge: "/Corona.png",
                        click_action: 'https://tcf.nitp.tech/events/' + eventId
                      }
                    }
            },
            messageString: "The event of the day is " + events[eventId]['name'] + '. Click here to learn more about the event!!'
        };
        return notificationFunctions.sendNotificationToEveryone(notificationData);
    })
});
export const eventNotice = functions.https.onCall((data, context) => {
    console.log(data);
    if(data && data.eventId && data.eventNotice) {
    const notificationData = {message: {
        token: null,
        notification: {
             title: "TCF'19 Notice",
            body: data.eventNotice
            },
            webpush: {
            headers: {
                Urgency: 'high'
                },
            fcm_options: {
                link: 'https://tcf.nitp.tech/events/' + data.eventId
            },
            notification: {
                body: data.eventNotice,
                requireInteraction: "true",
                badge: "/Corona.png",
                click_action: 'https://tcf.nitp.tech/events/' + data.eventId
              },
            }
        },
        messageString: data.eventNotice
    };
    return notificationFunctions.sendNotificationToEveryone(notificationData).then(() => {
        return {
            data: 'Success!! Notification sent.'
        }
    });
    }
    return { error: 'Sorry...an error occurred!'};
});


export const defaultFn = functions.database.ref('verifications/{id}').onWrite((snapshot, context) => {
    const signedUpUserUid = context.params.id;
    const data = snapshot.after.val();
    if(data && data.verified && data.verified === true) {
     return admin.database().ref('users/' + signedUpUserUid).once('value').then(signedUpUserRef => {
        const signedUpUser = signedUpUserRef.val();
        if(signedUpUser.referrer) {
            return admin.database().ref('users/' + signedUpUser.referrer).once('value').then(referrerData => {
                if(referrerData.exists) {
                    const referrerDataVal = referrerData.val();
                    if(!referrerDataVal.ambassador) {
                        referrerDataVal.ambassador = {
                            points: 0,
                            count: 0,
                            rank: 0
                        };
                    }
                    referrerDataVal.ambassador.points += 5;
                    referrerDataVal.ambassador.count += 1;
                    return admin.database().ref('users/' + signedUpUser.referrer).update(referrerDataVal);
                }
                return null;

            });
        }
        return null;
     });
    
    }
    return null;
});
function success(res) {
    return res.val();
}

// export const testFn = functions.https.onCall((data, context) => {
//     const notificationData = {message: {
//         token: null,
//         notification: {
//              title: "TCF'19 Notice",
//             body: data.eventNotice
//             },
//             webpush: {
//             headers: {
//                 Urgency: 'high'
//                 },
//             fcm_options: {
//                 link: 'https://tcf.nitp.tech/events/' + data.eventId
//             },
//             notification: {
//                 body: data.eventNotice,
//                 requireInteraction: "true",
//                 badge: "/Corona.png",
//                 click_action: 'https://tcf.nitp.tech/events/' + data.eventId
//               },
//             }
//         },
//         messageString: data.eventNotice
//     };
//     return notificationFunctions.sendNotificationToUser('aOBh4vQFatTHf9A8Sw1HvceGJ3b2', notificationData).then((res) => {
//         return console.log('sent');
//     });
// });