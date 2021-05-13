const _ = require('lodash')
const async = require('async')
const fs = require('fs')
const exec = require('child_process').exec;

const directories = ['publicIPlists', 'privateIPlists']
const argv = require('minimist')(process.argv.slice(2));

const dryRun = _.get(argv, 'dryRun') // --dryRun
if (dryRun) console.log('RUNNING IN DRY-RUN MODE - NOTHING WILL CHANGE')

const port = _.get(argv, 'port', 443)
const list = _.get(argv, 'list')
const remove = _.get(argv, 'remove')

let lists = []
let ips = []
async.series({
  loadPrivateLists: (done) => {
    if (remove) return done()
    async.eachSeries(directories, (dir, dirDone) => {
      let baseDir = __dirname + '/' + dir
      const listFiles = fs.readdirSync(baseDir)
      listFiles.forEach((file) => {
        if (file !== '.' && (!list || file === list )) {
          lists.push('./' + dir + '/' + file)
        }
      })
      return dirDone()  
    }, done)
  },
  loadLists: (done) => {
    if (remove) return done()
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
  removeEntriesFromUFW: (done) => {
    // delete all rules for port 443 (these are the one's added)
    console.log('')
    console.log(_.repeat('*', 80))
    console.log('')
    console.log("Deleting all UFW rules with port " + port + " - 'anywhere rules' are kept untouched!")
    if (dryRun) return done()

    const regex = /\[\s{0,1}(\d{1,3})\]/
    exec('ufw status numbered | grep ' + port, (err, result) => {
      if (err) {
        console.log('No rules found | %j', err)
        return done()
      }
      let rows = _.reverse(_.split(result, '\n'))
      async.eachSeries(rows, (row, itDone) => {
        let test = regex.exec(row)
        let entry = _.get(test, '[1]')
        if (!entry) return itDone()
        console.log('Deleting rule %s', entry)
        exec('"ufw" --force delete ' + entry, itDone)
      }, done)
    })
  },
  addEntriesToUFW: (done) => {
    if (remove) return done()
    console.log('')
    console.log(_.repeat('*', 80))
    console.log('')
    async.eachSeries(ips, (ip, itDone) => {
      let command = 'ufw allow from ' + ip.ip + ' to any port ' + port
      if (ip.comment) command += ' comment \'' + ip.comment + '\'' 
      console.log(command)
      if (dryRun) return itDone()
      exec(command, itDone)
    }, done)
  }
}, (err) => {
  if (err) console.log('UFW | Operation failed with %j', err)
  else if (remove) console.log('UFW | Removed all entries for port %s', port)
  else if (!dryRun) console.log('UFW | Rules updated for port %s', port)
  else console.log('UFW | Operation DRY RUN ended successfully')
})