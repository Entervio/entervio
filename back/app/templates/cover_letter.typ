#import "@preview/fireside:1.0.0": fireside

#let cover_letter_data = json(bytes(sys.inputs.cover_letter_data))

#show: fireside.with(
  title: [#cover_letter_data.title],
  from-details: [
    #raw(cover_letter_data.from_details, lang: none)
  ],
  to-details: [
    #raw(cover_letter_data.to_details, lang: none)
  ],
)

#cover_letter_data.greeting

#par(justify: true, leading: 0.65em)[
  #cover_letter_data.body
]

#v(1em)

#cover_letter_data.closing

#cover_letter_data.signature
