import * as functions from 'firebase-functions';

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
import * as admin from "firebase-admin";

const app = admin.initializeApp();
export const helloWorld = functions.firestore.document('verifications/{id}').onCreate((snapshot, context) => {
    return admin.firestore().doc('users/' + context.params.id).get().then(signedUpUserRef => {
        const signedUpUser = signedUpUserRef.data();
        if(signedUpUser.referrer) {
            const userRef = admin.firestore().doc('users/' + signedUpUser.referrer);
              admin.firestore().runTransaction((transaction) => {
                return transaction.get(userRef).then(referrer => {
                    const referrerData = referrer.data();
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
                        return transaction.update(userRef, referrerData);
                    }
                    return new Promise((resolve,reject) => resolve(true));
                });
            }).then(res => {
        return admin.firestore().collection('users').get().then(snap => {
            const users = snap.docs.map(doc => {
                return <any>{id: doc.id,...doc.data()};
            });
            const filteredUsers = users.filter(user => !!user.ambassador);
            filteredUsers.sort((a: any, b: any) =>  parseInt(b.ambassador.points) - parseInt(a.ambassador.points));
            return Promise.all(filteredUsers.map(userOfCollege => {
                return admin.firestore().doc('colleges/' + userOfCollege.collegeId).get();
            })).then(collegeNames => {
                filteredUsers.forEach((user, i) => {
                    user.ambassador.rank = i+1;
                    user.collegeName = collegeNames[i].data().name;
                     admin.firestore().doc('users/' + user.id).update({ambassador: user.ambassador}).then(success).catch(success);
                });
                     admin.firestore().doc('leaderboard/ambassadors').set({leaders: filteredUsers.slice(0,5)}).then((success)).catch(success);
            });
        });
    }).catch(success);
    } 
}).catch(success);
});
function success(res) {
    return res;
}
