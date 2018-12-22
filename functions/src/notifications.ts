import * as admin from "firebase-admin";
export class NotificationFunctions  {
    constructor() {
        return;
    }
    sendNotificationToEveryone = (notificationData) => {
        return Promise.all([this.sendNotificationToAllAnonymous(notificationData), this.sendNotificationToAllUsers(notificationData)])
        .then(res => {
             console.log('notification sent to everyone');
             return null;
        });
    }
    sendNotificationToAllAnonymous = (notificationData) => {
        appendBodyStringData(notificationData,'Hello...our anonymous user!  ');
        return this.getAllAnonymousFcmToken()
                .then(list => {
                    return Promise.all(list.map(token => {
                        notificationData.message.token = token;
                        return new Promise((resolve, reject) => {
                            admin.messaging().send(notificationData.message)
                            .then(() => {
                                resolve('success');
                            })
                            .catch(error => {
                                console.log('notification failure to unknown/' + token,error);
                               return admin.database().ref('fcmTokenList/unknown/' + token).remove().then(() => {
                                    resolve('success');
                                });
                            });
                        });
                    }));
                })
                .then(res => {
                     console.log('success sending to all anonymous users');
                     return null;
                });
    }
    sendNotificationToAllUsers = (notificationData) => {
        return this.getAllUserFcmTokenList()
        .then(userAndTokenList => {
                 return Promise.all(Object.keys(userAndTokenList).map(uid => {
                     return this.sendNotificationToUser(uid, notificationData, userAndTokenList[uid]);
                 }));
        })
        .then(res => {
            console.log('success sending notification to all users');
            return null;
        })
        
    }
    sendNotificationToUser = (uid, notificationData, tokenList?) => {
        return Promise.all([this.getUserDetail(uid),
             (tokenList && Promise.resolve(tokenList)) || this.getUserFcmTokenList(uid)])
        .then(res => {
            if(res[1] === null || res[0] === null) {
                console.log(res[0], res[1]);
                return null;
            }
            appendBodyStringData(notificationData,'Hello ' + res[0].name + '  ');
            return Promise.all(res[1].map(token => {
                notificationData.message.token = token;
                return new Promise((resolve, reject) => { 

                    admin.messaging().send(notificationData.message).then(() => {
                        resolve('success');
                    }).catch(error => {
                        console.log('notification failure to users/' + uid + '/' + token,error);
                        return admin.database().ref('fcmTokenList/users/' + uid + '/' + token).remove().then(() => {
                            resolve('success');
                        });
                    });
                 }); 
            }));
        })
    }
    getUserFcmTokenList = (uid) => {
        return admin.database().ref('/fcmTokenList/users/' + uid).once('value')
        .then(success)
        .then(mapping => Object.keys(mapping));
    }
    getAllUserFcmTokenList = () => {
        return admin.database().ref('/fcmTokenList/users/').once('value')
        .then(success)
        .then(userToTokenMappings => {
            Object.keys(userToTokenMappings).forEach(userId => {
                userToTokenMappings[userId] = Object.keys(userToTokenMappings[userId]);
            });
            return userToTokenMappings;
        });
    };
    getAllAnonymousFcmToken = () => {
        return admin.database().ref('/fcmTokenList/unknown/').once('value')
        .then(success)
        .then(unknownTokens => Object.keys(unknownTokens));
    }
    getUserDetail = (uid) => {
        return admin.database().ref('/users/' + uid).once('value').then(success);
    }
}
function success(result) {
    return result.val();
}
function appendBodyStringData(notificationData, str) {
    notificationData.message.notification.body = str + notificationData.messageString;
    notificationData.message.webpush.notification.body = str + notificationData.messageString;
}