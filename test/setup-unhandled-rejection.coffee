setup = () ->

  unless @done
    process.on 'unhandledRejection', (reason) ->
      console.error 'Unhandled Rejection:\n', reason
      process.exit 1
    @done = yes

setup()
