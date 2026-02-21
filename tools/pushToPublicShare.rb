#!/usr/bin/env ruby
require 'net/http'
require 'uri'
require 'json'
require 'optparse'
require 'net/http/post/multipart'

# Argumente parsen
options = {}
OptionParser.new do |opts|
  opts.banner = "Usage: pushToPublicShare.rb --server URL --token TOKEN --path PATH file1 file2 ..."

  opts.on("--server URL", "Server URL (z.B. https://example.com)") { |v| options[:server] = v }
  opts.on("--token TOKEN", "Bearer-Token") { |v| options[:token] = v }
  opts.on("--path PATH", "Upload-Pfad relativ zum Root auf dem Server") { |v| options[:path] = v }
end.parse!

files = ARGV
if options[:server].nil? || options[:token].nil? || options[:path].nil? || files.empty?
  abort("Fehler: --server, --token, --path und mindestens eine Datei müssen angegeben werden.")
end

uri = URI.join(options[:server], "/api/upload")

files.each do |file_path|
  unless File.exist?(file_path)
    warn "Datei nicht gefunden: #{file_path}"
    next
  end

  File.open(file_path) do |file|
    req = Net::HTTP::Post::Multipart.new uri.path,
      "file" => UploadIO.new(file, "application/octet-stream", File.basename(file_path)),
      "path" => options[:path]

    req["Authorization"] = "Bearer #{options[:token]}"

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = (uri.scheme == "https")

    res = http.request(req)

    puts "Upload #{file_path}: #{res.code} #{res.message}"
    begin
      puts JSON.pretty_generate(JSON.parse(res.body))
    rescue
      puts res.body
    end
  end
end
