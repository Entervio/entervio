#let title_size = 44pt
#let project(
  background: rgb("f4f1eb"),
  title: "",
  from_details: none,
  margin: 2.1cm,
  body
) = {
  set page(fill: background, margin: margin)
  set text(font: ("HK Grotesk", "Hanken Grotesk"))

  grid(
    columns: (1fr, auto),
    [
      #set text(size: title_size, weight: "bold")
      #set par(leading: 0.4em)
      #title
    ],
    align(end + top, box(
      inset: (top: 0.5em),
      [
        #set text(size: 10.2pt, fill: rgb("4d4d4d"))
        #set par(leading: 0.5em)
        #from_details
      ]
    )),
  )
  v(title_size * 0.8)

  set text(size: 11pt, weight: "medium")
  body
}

#let cover_letter_data = json(bytes(sys.inputs.cover_letter_data))
#show: project.with(
  title: [Lettre de Motivation],
  from_details: cover_letter_data.from_details,
)

#text(weight: "bold")[#cover_letter_data.greeting]

#v(1em)

#par(justify: true, leading: 0.65em)[
  #cover_letter_data.body
]

#v(1em)

#cover_letter_data.closing
