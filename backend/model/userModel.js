const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto')

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Enter a Username']
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: [true, 'Please enter an email'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Please enter a password'],
        minlength: 8,
        select: false
    },
    checkPassword: {
        type: String,
        required: [true, 'Please confirm your password'],
        validate: {
            validator: function (el){
                return el==this.password;
            },
            message: "Passwords are not the same"
        }
    },
    role: {
        type: String,
        enum: ['admin', 'writer', 'reader'],
        default: 'reader'
    },
    passwordChangedAt:{
        type: Date,
        select: false
    },
    date: {
        type: Date,
        default: Date.now
    },
    passwordResetToken: String,
    passwordResetExpires: Date
})




userSchema.pre('save', async function(next){
    if (!this.isModified('password')) return next();

    //hash the password
    this.password = await bcrypt.hash(this.password, 12);

    //delete the checkpassword field
    this.checkPassword = undefined;
    next();
})

userSchema.pre('save', function(next){
    if (!this.isModified('password') || this.isNew) return next();
     
    this.passwordChangedAt = Date.now() - 1000; 
    // sometimes the new Token is generated way too soon before the timestamp for password change is created so we need to subtract some time from that timestamp
    next();

})

userSchema.methods.correctPassword = async function(password, actualPassword){
    return await bcrypt.compare(password, actualPassword);
}



userSchema.methods.changedPasswordAfter = function(JWTTimestamp){
    const passwordChangedAt = this.passwordChangedAt
    if (passwordChangedAt){
        const changedTimeStamp = parseInt(passwordChangedAt.getTime()/1000, 10);

        return JWTTimestamp < changedTimeStamp;
    } 

    return false
}

userSchema.methods.createPasswordResetToken = function(){
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

    return resetToken;
}

const UserData = mongoose.model('UserData', userSchema);
module.exports = UserData;