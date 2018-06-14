const _ = require('lodash')
const async = require('async')
const fs = require('fs')
const exec = require('child_process').exec;

const directories = ['publicIPlists', 'privateIPlists']

const dryRun = process.argv[2] // --dryRun
if (dryRun) console.log('RUNNING IN DRY-RUN MODE - NOTHING WILL CHANGE')

let lists = []
let ips = []
async.series({
  loadPrivateLists: function(done) {
    async.eachSeries(directories, (dir, dirDone) => {
      let baseDir = __dirname + '/' + dir
      const listFiles = fs.readdirSync(baseDir)
      listFiles.forEach(function (file) {
        if (file !== '.') {
          lists.push('./' + dir + '/' + file)
        }
      })
      return dirDone()  
    }, done)
  },
  loadLists: function(done) {
    async.eachSeries(lists, (list, itDone) => {
      if (!list) return itDone()
      fs.readFile(list, 'utf-8', (err, result) => {
        if (err) return itDone(err)
        console.log('')
        console.log('STARTING NEW FILE')
        console.log('Reading from %s', list)
        console.log('')
        _.forEach(_.split(result, '\n'), (ip) => {
          if (_.startsWith(ip, '#')) {
            // this is a comment -> just write it to console
            console.log('')
            console.log(ip)
          }
          else if (ip) {
            console.log('Adding %s', ip)
            ips.push(_.trim(ip))  
          }
        })
        console.log(_.repeat('-', 40))
        return itDone()
      })
    }, done)
  },
  removeEntriesFromUFW: function(done) {
    // delete all rules for port 443 (these are the one's added)
    console.log('')
    console.log(_.repeat('*', 80))
    console.log('')
    console.log("Deleting all UFW rules with port 443 - 'anywhere rules' are kept untouched!")
    if (dryRun) return done()
    exec('ufw --force delete $(ufw status numbered |(grep \'443\'|awk -F"[][]" \'{print $2}\'))\n', done)
  },
  addEntriesToUFW: function(done) {
    console.log('')
    console.log(_.repeat('*', 80))
    console.log('')
    async.eachSeries(ips, function(ip, itDone) {
      console.log('ufw allow from %s to any port 443', ip)
      if (dryRun) return itDone()
      exec('ufw allow from ' + ip + ' to any port 443', itDone)
    }, done)
  }
}, function allDone(err) {
  if (err) console.log('Operation failed with', err)
  else console.log('UFW rules updated')
})