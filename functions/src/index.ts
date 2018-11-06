import * as functions from 'firebase-functions';

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
import * as admin from "firebase-admin";

var app = admin.initializeApp();
export const helloWorld = functions.firestore.document('users/{id}').onCreate((snapshot) => {
    const signedUpUser = snapshot.data();
    if(signedUpUser.referrer) {
        const userRef = admin.firestore().doc('users/' + signedUpUser.referrer);
        return admin.firestore().runTransaction((transaction) => {
            return transaction.get(userRef).then(referrer => {
                let referrerData = referrer.data();
                if(referrer.exists) {
                    if(!referrerData.ambassador) {
                        referrerData.ambassador = {
                            points: 0,
                            count: 0,
                            rank: 0
                        };
                    }
                   referrerData.ambassador.points += 5;
                   referrerData.ambassador.count += 1;
                    transaction.update(userRef, referrerData);
                }
            });
        });
    }
    return admin.firestore().collection('users').get().then(snap => {
        const users = snap.docs.map(doc => {
            return <any>{id: doc.id,...doc.data()};
        });
        const filteredUsers = users.filter(user => !!user.ambassador);
        filteredUsers.sort((a: any, b: any) =>  a.ambassador.points - b.ambassador.points);
        console.log(users);
        filteredUsers.forEach((user, i) => {
            user.ambassador.rank = i+1;
            return admin.firestore().doc('users/' + user.id).update({ambassador: user.ambassador}).then(res => res);
        });
        if(filteredUsers.length > 5) {
            return admin.firestore().collection('leaderboard').doc('ambassadors').set(filteredUsers.slice(0,5).map(user => user.id)).then(res => res);
        } else {
           return admin.firestore().collection('leaderboard').doc('ambassadors').set(filteredUsers.map(user => user.id)).then(res => res);
        }
    });
});