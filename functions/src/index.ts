import * as functions from 'firebase-functions';

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
import * as admin from "firebase-admin";

var app = admin.initializeApp();
export const defaultFn = functions.database.ref('verifications/{id}').onWrite((snapshot, context) => {
    const signedUpUserUid = context.params.id;
    const data = snapshot.after.val();
    if(data && data.verified && data.verified === true) {
     return admin.database().ref('users/' + signedUpUserUid).once('value').then(signedUpUserRef => {
        const signedUpUser = signedUpUserRef.val();
        if(signedUpUser.referrer) {
            return admin.database().ref('users/' + signedUpUser.referrer).once('value').then(referrerData => {
                if(referrerData.exists) {
                    let referrerDataVal = referrerData.val();
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
    // return admin.firestore().collection('users').get().then(snap => {
    //     const users = snap.docs.map(doc => {
    //         return <any>{id: doc.id,...doc.data()};
    //     });
    //     const filteredUsers = users.filter(user => !!user.ambassador);
    //     filteredUsers.sort((a: any, b: any) =>  a.ambassador.points - b.ambassador.points);
    //     console.log(users);
    //     // filteredUsers.forEach((user, i) => {
    //     //     user.ambassador.rank = i+1;
    //     //     return admin.firestore().doc('users/' + user.id).update({ambassador: user.ambassador}).then(res => res);
    //     // });
    //     if(filteredUsers.length > 5) {
    //         return admin.firestore().collection('leaderboard').doc('ambassadors').set(filteredUsers.slice(0,5).map(user => user.id)).then(res => res);
    //     } else {
    //        return admin.firestore().collection('leaderboard').doc('ambassadors').set(filteredUsers.map(user => user.id)).then(res => res);
    //     }
    // });
});