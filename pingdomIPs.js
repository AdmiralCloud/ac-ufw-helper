const xml2js = require('xml2js')
const _ = require('lodash')
const async = require('async')
const request = require('request');
const fs = require('fs')

const ipList = './publicIPlists/pingdom.txt'
const rssUrl = 'https://my.pingdom.com/probes/feed'
const filter = ['EU']

let ips = []
async.series({
  getList: function(done) {
    request({
      url: rssUrl,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.11; rv:45.0) Gecko/20100101 Firefox/45.0',
        accept: 'text/html,application/xhtml+xml'
      },
      pool: false,
      followRedirect: true
    }, function (error, response, xml) {
      if (!error && response.statusCode == 200) {
        const parser = new xml2js.Parser({ trim: false, normalize: true, mergeAttrs: true });
        parser.addListener("error", done)
        parser.parseString(xml, function (err, result) {
          _.forEach(_.get(result, 'rss.channel[0].item', []), function(item) {
            let region = _.first(_.get(item, 'pingdom:region'))
            let ip = _.first(_.get(item, 'pingdom:ip'))
            if (_.indexOf(filter, region) > -1) {
              ips.push(ip + ' Pingdom')
            }
          })
          return done()
        });

      } else {
        return done('error')
      }
    });
  },
  writeList: function(done) {
    fs.writeFile(ipList, ips.join('\n'), done)
  },
}, function(err) {
  if (err) console.error(err)
  else console.log('IPlist %s successfully written', ipList)
})
