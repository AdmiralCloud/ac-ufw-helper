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
        _.forEach(_.split(result, '\n'), (row) => {
          if (_.startsWith(row, '#')) {
            // this is a comment -> just write it to console
            console.log('')
            console.log(row)
          }
          else if (row) {
            let rowParts = _.split(row, ' ', 2)
            let ip = _.trim(_.first(rowParts))
            let comment = _.trim(_.last(rowParts))
            if (ip === comment) comment = null
            console.log('Adding %s', ip, (comment ? ' for ' + comment : ''))
            ips.push({ ip, comment })  
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
      let command = 'ufw allow from ' + ip.ip + ' to any port 443'
      if (ip.comment) command += ' comment \'' + ip.comment + '\'' 
      console.log(command)
      if (dryRun) return itDone()
      exec(command, itDone)
    }, done)
  }
}, function allDone(err) {
  if (err) console.log('Operation failed with', err)
  else if (!dryRun) console.log('UFW rules updated')
  else console.log('Operation DRY RUN ended successfully')
})